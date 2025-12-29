using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SkuVaultSaaS.Api.Models;
using SkuVaultSaaS.Api.Services;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Core.Enums;
using SkuVaultSaaS.Infrastructure.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly IConfiguration _config;
        private readonly IEmailService _emailService;
        private readonly ITwoFactorService _twoFactorService;
        private readonly ILogger<AuthController> _logger;
        private readonly ApplicationDbContext _context;

        public AuthController(UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IConfiguration config,
            IEmailService emailService,
            ITwoFactorService twoFactorService,
            ILogger<AuthController> logger,
            ApplicationDbContext context)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _config = config;
            _emailService = emailService;
            _twoFactorService = twoFactorService;
            _logger = logger;
            _context = context;
            _logger = logger;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest("Email and Password are required.");
            }

            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                // Use consistent timing to prevent user enumeration
                await Task.Delay(100);
                return Unauthorized("Invalid credentials.");
            }

            var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
            if (!result.Succeeded)
            {
                return Unauthorized("Invalid credentials.");
            }

            // Check if 2FA is enabled and needs verification
            if (user.TwoFactorEnabled)
            {
                var lastVerified = user.LastTwoFactorVerified;
                var requiresVerification = lastVerified == null || DateTime.UtcNow.Subtract(lastVerified.Value).TotalDays >= 7;

                if (requiresVerification)
                {
                    // Generate a temporary token for 2FA verification (valid for 5 minutes)
                    var tempToken = await GenerateTempTokenAsync(user, 5);
                    return Ok(new Login2FAResponse
                    {
                        RequiresTwoFactor = true,
                        TempToken = tempToken.Item1,
                        Message = "Two-factor authentication required. Please enter your 6-digit code."
                    });
                }
            }

            // No 2FA required or recently verified, issue regular token
            var token = await GenerateJwtTokenAsync(user);
            var roles = await _userManager.GetRolesAsync(user);
            
            // Set secure httpOnly cookie
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Expires = token.Item2,
                Path = "/"
            };
            Response.Cookies.Append("AuthToken", token.Item1, cookieOptions);
            
            return Ok(new { 
                email = user.Email,
                expires = token.Item2,
                roles = roles,
                message = "Login successful"
            });
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            Response.Cookies.Delete("AuthToken", new CookieOptions
            {
                HttpOnly = true,
                Secure = true, // Match login settings for cross-origin
                SameSite = SameSiteMode.None,
                Path = "/"
            });
            
            return Ok(new { message = "Logout successful" });
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (request.NewPassword != request.ConfirmPassword)
            {
                return BadRequest("New password and confirmation password do not match.");
            }

            var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ?? 
                        User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? 
                        User.FindFirst("sub")?.Value;
            
            if (userId == null)
            {
                return Unauthorized();
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound("User not found.");
            }

            var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description).ToList();
                return BadRequest(new { errors });
            }

            return Ok(new { message = "Password changed successfully." });
        }

        [HttpPost("2fa/setup")]
        [Authorize]
        public async Task<IActionResult> Setup2FA()
        {
            var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ?? 
                        User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? 
                        User.FindFirst("sub")?.Value;
            
            if (userId == null)
            {
                return Unauthorized();
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound("User not found.");
            }

            var (secret, qrCodeUri) = _twoFactorService.GenerateTwoFactorSecret(user.Email!);
            var backupCodes = _twoFactorService.GenerateBackupCodes();

            // Store temporary secret for verification (don't enable yet)
            user.TwoFactorSecret = secret;
            user.BackupCodes = backupCodes;
            await _userManager.UpdateAsync(user);

            return Ok(new SetupTwoFactorResponse
            {
                Secret = secret,
                QrCodeUri = qrCodeUri,
                BackupCodes = backupCodes
            });
        }

        [HttpPost("2fa/verify")]
        [Authorize]
        public async Task<IActionResult> Verify2FA([FromBody] VerifyTwoFactorRequest request)
        {
            if (string.IsNullOrEmpty(request.Code))
            {
                return BadRequest("Verification code is required.");
            }

            var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ?? 
                        User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? 
                        User.FindFirst("sub")?.Value;
            
            if (userId == null)
            {
                return Unauthorized();
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound("User not found.");
            }

            if (string.IsNullOrEmpty(user.TwoFactorSecret))
            {
                return BadRequest("2FA setup has not been initiated.");
            }

            if (!_twoFactorService.VerifyCode(user.TwoFactorSecret, request.Code))
            {
                return BadRequest("Invalid verification code.");
            }

            // Enable 2FA
            user.TwoFactorEnabled = true;
            user.TwoFactorVerified = true;
            user.LastTwoFactorVerified = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);

            return Ok(new VerifyTwoFactorResponse
            {
                Success = true,
                Message = "Two-factor authentication has been enabled successfully.",
                BackupCodes = user.BackupCodes
            });
        }

        [HttpPost("login-2fa")]
        [AllowAnonymous]
        public async Task<IActionResult> LoginWith2FA([FromBody] LoginWith2FARequest request)
        {
            if (string.IsNullOrEmpty(request.Code))
            {
                return BadRequest("Verification code is required.");
            }

            // Try to get user from temp token (if provided)
            var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ?? 
                        User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? 
                        User.FindFirst("sub")?.Value;

            if (userId == null)
            {
                return Unauthorized("2FA verification failed. Please log in again.");
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return Unauthorized("User not found.");
            }

            if (!user.TwoFactorEnabled)
            {
                return BadRequest("2FA is not enabled for this account.");
            }

            if (string.IsNullOrEmpty(user.TwoFactorSecret))
            {
                return BadRequest("2FA setup is incomplete.");
            }

            // Check if code is a backup code first
            bool codeValid = false;
            bool isBackupCode = false;

            if (user.BackupCodes != null && _twoFactorService.UseBackupCode(user.BackupCodes, request.Code))
            {
                codeValid = true;
                isBackupCode = true;
            }
            else if (_twoFactorService.VerifyCode(user.TwoFactorSecret, request.Code))
            {
                codeValid = true;
            }

            if (!codeValid)
            {
                return BadRequest("Invalid verification code or backup code.");
            }

            // Update last verified timestamp
            user.LastTwoFactorVerified = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);

            // Generate full JWT token
            var token = await GenerateJwtTokenAsync(user);
            
            // Set secure httpOnly cookie
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Expires = token.Item2,
                Path = "/"
            };
            Response.Cookies.Append("AuthToken", token.Item1, cookieOptions);

            return Ok(new
            {
                email = user.Email,
                expires = token.Item2,
                message = isBackupCode ? "Login successful (backup code used)" : "Login successful"
            });
        }

        [HttpPost("2fa/disable")]
        [Authorize]
        public async Task<IActionResult> Disable2FA()
        {
            var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ?? 
                        User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? 
                        User.FindFirst("sub")?.Value;
            
            if (userId == null)
            {
                return Unauthorized();
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound("User not found.");
            }

            user.TwoFactorEnabled = false;
            user.TwoFactorVerified = false;
            user.TwoFactorSecret = null;
            user.BackupCodes = null;
            await _userManager.UpdateAsync(user);

            return Ok(new { message = "Two-factor authentication has been disabled." });
        }

        [HttpGet("2fa/status")]
        [Authorize]
        public async Task<IActionResult> Get2FAStatus()
        {
            var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ?? 
                        User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? 
                        User.FindFirst("sub")?.Value;
            
            if (userId == null)
            {
                return Unauthorized();
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound("User not found.");
            }

            return Ok(new TwoFactorStatusResponse
            {
                IsEnabled = user.TwoFactorEnabled,
                IsVerified = user.TwoFactorVerified,
                BackupCodesRemaining = user.BackupCodes?.Count ?? 0
            });
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            // Try multiple claim types as JWT claims can be mapped differently
            var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ?? 
                        User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? 
                        User.FindFirst("sub")?.Value;
            
            if (userId == null)
            {
                return Unauthorized();
            }

            var user = await _userManager.FindByIdAsync(userId);
            
            if (user == null)
            {
                return Unauthorized();
            }

            var roles = await _userManager.GetRolesAsync(user);
            
            var result = new
            {
                id = user.Id,
                email = user.Email,
                roles = roles,
                customerId = user.CustomerId, // Will be null until payment is made
                customerRole = user.CustomerRole.ToString()
            };
            
            return Ok(result);
        }
        
        [HttpPost("signup")]
        [AllowAnonymous]
        public async Task<IActionResult> Signup([FromBody] SignupRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest("Email and password are required.");
            }

            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return BadRequest("User with this email already exists.");
            }

            var user = new ApplicationUser
            {
                UserName = request.Email,
                Email = request.Email,
                EmailConfirmed = false, // Require email verification
                CustomerRole = CustomerRole.Owner // Default role for new users (will own their own customer)
            };

            var result = await _userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors.Select(e => e.Description));
            }

            await _userManager.AddToRoleAsync(user, "CustomerUser");

            // NOTE: Customer and Tenant are created during payment (CreatePaymentIntent)
            // NOT during signup, to keep the flow clean and only charge for actual members

            // Generate email confirmation token
            var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            var confirmationLink = $"{Request.Scheme}://{Request.Host}/api/auth/confirm-email?userId={user.Id}&token={Uri.EscapeDataString(token)}";

            // Send verification email (don't await to avoid blocking signup)
            _ = Task.Run(async () =>
            {
                try
                {
                    await _emailService.SendEmailVerificationAsync(request.Email, confirmationLink);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send verification email to {Email}", request.Email);
                }
            });

            return Ok(new { 
                message = "Account created successfully. Please check your email to verify your account.",
                verificationLink = confirmationLink // For development - remove in production
            });
        }

        [HttpGet("confirm-email")]
        [AllowAnonymous]
        public async Task<IActionResult> ConfirmEmail([FromQuery] string userId, [FromQuery] string token)
        {
            if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(token))
            {
                return BadRequest("Invalid confirmation link.");
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return BadRequest("Invalid confirmation link.");
            }

            if (user.EmailConfirmed)
            {
                // Already confirmed, redirect to account setup (tier selection)
                return Redirect("/app/account-setup");
            }

            var result = await _userManager.ConfirmEmailAsync(user, token);
            if (!result.Succeeded)
            {
                return BadRequest("Email confirmation failed. The link may be expired or invalid.");
            }

            // Email confirmed successfully - generate JWT and redirect to account setup with token
            var (jwtToken, _) = await GenerateJwtTokenAsync(user);
            
            // Redirect to frontend account setup page with token
            // Frontend will store the token and show tier selection
            return Redirect($"/app/account-setup?token={Uri.EscapeDataString(jwtToken)}");
        }

        [HttpPost("resend-verification")]
        [AllowAnonymous]
        public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest("Email is required.");
            }

            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                return BadRequest("User not found.");
            }

            if (user.EmailConfirmed)
            {
                return BadRequest("Email is already verified.");
            }

            // Generate new email confirmation token
            var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            var confirmationLink = $"{Request.Scheme}://{Request.Host}/api/auth/confirm-email?userId={user.Id}&token={Uri.EscapeDataString(token)}";

            // Send verification email (don't await to avoid blocking)
            _ = Task.Run(async () =>
            {
                try
                {
                    await _emailService.SendEmailVerificationAsync(request.Email, confirmationLink);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to resend verification email to {Email}", request.Email);
                }
            });

            return Ok(new { message = "Verification email sent successfully." });
        }

        [HttpGet("test")]
        [AllowAnonymous]
        public IActionResult Test() => Ok(new { message = "test works" });

        private Task<(string, DateTime)> GenerateTempTokenAsync(ApplicationUser user, int expiresMinutes)
        {
            var jwtSection = _config.GetSection("Jwt");
            var key = jwtSection.GetValue<string>("Key") ?? throw new InvalidOperationException("Jwt:Key not configured");
            var issuer = jwtSection.GetValue<string>("Issuer") ?? "SkuVaultSaaS";
            var audience = jwtSection.GetValue<string>("Audience") ?? "SkuVaultSaaSClients";

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
                new Claim("temp_auth", "2fa_verification"), // Mark this as temporary token
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddMinutes(expiresMinutes);

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: expires,
                signingCredentials: creds);

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
            return Task.FromResult((tokenString, expires));
        }

        private async Task<(string, DateTime)> GenerateJwtTokenAsync(ApplicationUser user)
        {
            var jwtSection = _config.GetSection("Jwt");
            var key = jwtSection.GetValue<string>("Key") ?? throw new InvalidOperationException("Jwt:Key not configured");
            var issuer = jwtSection.GetValue<string>("Issuer") ?? "SkuVaultSaaS";
            var audience = jwtSection.GetValue<string>("Audience") ?? "SkuVaultSaaSClients";
            var expiresMinutes = jwtSection.GetValue<int?>("ExpiresMinutes") ?? 60;

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };
            


            var roles = await _userManager.GetRolesAsync(user);
            claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddMinutes(expiresMinutes);

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: expires,
                signingCredentials: creds);

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
            return (tokenString, expires);
        }
    }
}
