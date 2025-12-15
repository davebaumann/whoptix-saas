using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SkuVaultSaaS.Api.Models;
using SkuVaultSaaS.Core.Models;
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

        public AuthController(UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IConfiguration config)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _config = config;
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
                Secure = true, // Required for cross-origin cookies
                SameSite = SameSiteMode.None, // Required for cross-origin cookies
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

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            Console.WriteLine($"[AUTH DEBUG] GetCurrentUser called");
            
            // Try multiple claim types as JWT claims can be mapped differently
            var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ?? 
                        User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? 
                        User.FindFirst("sub")?.Value;
            
            Console.WriteLine($"[AUTH DEBUG] All claims: {string.Join(", ", User.Claims.Select(c => $"{c.Type}={c.Value}"))}");
            Console.WriteLine($"[AUTH DEBUG] UserId from token: {userId}");
            
            if (userId == null)
            {
                Console.WriteLine($"[AUTH DEBUG] UserId is null, returning Unauthorized");
                return Unauthorized();
            }

            var user = await _userManager.FindByIdAsync(userId);
            Console.WriteLine($"[AUTH DEBUG] User found: {user?.Email}");
            
            if (user == null)
            {
                Console.WriteLine($"[AUTH DEBUG] User not found in database, returning Unauthorized");
                return Unauthorized();
            }

            var roles = await _userManager.GetRolesAsync(user);
            Console.WriteLine($"[AUTH DEBUG] User roles: {string.Join(", ", roles)}");
            
            // TODO: Implement proper user-customer relationship lookup
            // Temporarily adding customerId = 1 for development
            var result = new
            {
                id = user.Id,
                email = user.Email,
                roles = roles,
                customerId = user.CustomerId
            };
            
            Console.WriteLine($"[AUTH DEBUG] Returning OK with user data");
            return Ok(result);
        }
        
        [HttpGet("test")]
        [AllowAnonymous]
        public IActionResult Test() => Ok(new { message = "test works" });

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
            
            Console.WriteLine($"[AUTH DEBUG] Creating JWT with UserId: {user.Id}");
            Console.WriteLine($"[AUTH DEBUG] JWT Claims: {string.Join(", ", claims.Select(c => $"{c.Type}={c.Value}"))}");

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
