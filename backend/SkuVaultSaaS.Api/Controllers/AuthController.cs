using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SkuVaultSaaS.Api.Models;
using SkuVaultSaaS.Api.Services;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Core.Models;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<IdentityUser> _userManager;
        private readonly SignInManager<IdentityUser> _signInManager;
        private readonly IConfiguration _config;
        private readonly IEmailService _emailService;
        private readonly ApplicationDbContext _context;

        public AuthController(UserManager<IdentityUser> userManager,
            SignInManager<IdentityUser> signInManager,
            IConfiguration config,
            IEmailService emailService,
            ApplicationDbContext context)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _config = config;
            _emailService = emailService;
            _context = context;
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
                return Unauthorized();
            }

            var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: false);
            if (!result.Succeeded)
            {
                return Unauthorized();
            }

            var token = await GenerateJwtTokenAsync(user);
            
            // Set secure httpOnly cookie
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = false, // Set to true in production with HTTPS
                SameSite = SameSiteMode.Lax, // Changed from Strict for development
                Expires = token.Item2,
                Path = "/"
            };
            
            Response.Cookies.Append("AuthToken", token.Item1, cookieOptions);
            
            // Return user info (without token)
            return Ok(new { 
                email = user.Email,
                expires = token.Item2,
                message = "Login successful"
            });
        }

        [HttpPost("signup")]
        [AllowAnonymous]
        public async Task<IActionResult> Signup([FromBody] SignupRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Check if user already exists
            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return BadRequest("An account with this email already exists.");
            }

            // Create the user
            var user = new IdentityUser
            {
                UserName = request.Email,
                Email = request.Email,
                EmailConfirmed = true // For now, we'll auto-confirm emails
            };

            var result = await _userManager.CreateAsync(user, request.Password);
            
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors.Select(e => e.Description));
            }

            // Add customer role
            await _userManager.AddToRoleAsync(user, "CustomerUser");

            // Create or get default tenant for this customer
            var tenant = new Tenant
            {
                Name = request.CompanyName
            };
            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync();

            // Create customer record with basic membership (Level 1)
            var customer = new Customer
            {
                ExternalId = Guid.NewGuid().ToString(), // Generate unique external ID
                Name = $"{request.FirstName} {request.LastName}".Trim(),
                Email = request.Email,
                TenantId = tenant.Id,
                // MembershipLevel will default to Basic as defined in the model
                LastSyncedAt = DateTime.UtcNow
            };

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            // Auto-login the user after successful signup
            var loginResult = await _signInManager.CheckPasswordSignInAsync(user, request.Password, false);
            
            if (loginResult.Succeeded)
            {
                // Generate JWT token and set cookie (same as login)
                var token = await GenerateJwtTokenAsync(user);
                
                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Expires = token.Item2,
                    Secure = false,
                    SameSite = SameSiteMode.Lax,
                    Path = "/"
                };
                
                Response.Cookies.Append("AuthToken", token.Item1, cookieOptions);
                
                return Ok(new
                {
                    email = user.Email,
                    expires = token.Item2,
                    message = "Account created successfully and logged in"
                });
            }

            return Ok(new { message = "Account created successfully. Please log in." });
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            Response.Cookies.Delete("AuthToken", new CookieOptions
            {
                HttpOnly = true,
                Secure = false, // Match login settings for development
                SameSite = SameSiteMode.Lax,
                Path = "/"
            });
            
            return Ok(new { message = "Logout successful" });
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            // Debug: Log all available claims
            foreach (var claim in User.Claims)
            {
                Console.WriteLine($"Claim Type: {claim.Type}, Value: {claim.Value}");
            }

            var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            if (userId == null)
            {
                // Try alternative claim types
                userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userId == null)
                {
                    Console.WriteLine("No userId found in Sub or NameIdentifier claims");
                    return Unauthorized("User ID not found in token");
                }
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                Console.WriteLine($"No user found with ID: {userId}");
                return Unauthorized("User not found");
            }

            var roles = await _userManager.GetRolesAsync(user);
            
            // Get customer information if user is not an admin
            int? customerId = null;
            string? customerName = null;
            
            if (!roles.Contains("Admin"))
            {
                var customer = await _context.Customers
                    .FirstOrDefaultAsync(c => c.Email == user.Email);
                if (customer != null)
                {
                    customerId = customer.Id;
                    customerName = customer.Name;
                    Console.WriteLine($"Found customer: {customerId} - {customerName} for email: {user.Email}");
                }
                else
                {
                    Console.WriteLine($"No customer found for email: {user.Email}");
                    // For backward compatibility, assign customer ID 1 for now
                    customerId = 1;
                    var defaultCustomer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == 1);
                    customerName = defaultCustomer?.Name ?? "Default Customer";
                    Console.WriteLine($"Using default customer ID 1 for user: {user.Email}");
                }
            }

            return Ok(new
            {
                id = user.Id,
                email = user.Email,
                roles = roles,
                customerId = customerId,
                customerName = customerName
            });
        }

        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ResetPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest("Email is required.");
            }

            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                // Return success even if user doesn't exist to prevent email enumeration
                return Ok(new { message = "If your email is in our system, you will receive a password reset link." });
            }

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var resetUrl = $"{Request.Scheme}://{Request.Host}/reset-password";
            
            await _emailService.SendPasswordResetEmailAsync(user.Email!, token, resetUrl);

            return Ok(new { message = "If your email is in our system, you will receive a password reset link." });
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordConfirm request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || 
                string.IsNullOrWhiteSpace(request.Token) || 
                string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest("Email, token, and new password are required.");
            }

            if (request.NewPassword != request.ConfirmPassword)
            {
                return BadRequest("Passwords do not match.");
            }

            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                return BadRequest("Invalid reset request.");
            }

            var result = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors.Select(e => e.Description));
            }

            return Ok(new { message = "Password has been reset successfully." });
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.CurrentPassword) || 
                string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest("Current password and new password are required.");
            }

            if (request.NewPassword != request.ConfirmPassword)
            {
                return BadRequest("Passwords do not match.");
            }

            var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            if (userId == null)
            {
                userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            }

            if (userId == null)
            {
                return Unauthorized("User not found.");
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return Unauthorized("User not found.");
            }

            var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors.Select(e => e.Description));
            }

            return Ok(new { message = "Password changed successfully." });
        }

        private async Task<(string, DateTime)> GenerateJwtTokenAsync(IdentityUser user)
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
