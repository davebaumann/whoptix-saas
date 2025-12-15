using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Api.Services;
using SkuVaultSaaS.Core.Enums;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Infrastructure.Data;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserManagementController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly UserContextService _userContext;

        public UserManagementController(ApplicationDbContext context, UserManager<ApplicationUser> userManager, UserContextService userContext)
        {
            _context = context;
            _userManager = userManager;
            _userContext = userContext;
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetCustomerUsers()
        {
            var currentUserId = _userContext.GetCurrentUserId();
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();
            var currentUser = await _userManager.FindByIdAsync(currentUserId);
            
            if (currentUser?.CustomerId == null)
            {
                return BadRequest("User not associated with a customer");
            }

            var users = await _context.Users
                .Where(u => u.CustomerId == currentUser.CustomerId)
                .Select(u => new {
                    u.Id,
                    u.Email,
                    u.CustomerRole,
                    IsCurrentUser = u.Id == currentUserId
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpPut("users/{userId}/role")]
        public async Task<IActionResult> UpdateUserRole(string userId, [FromBody] UpdateRoleRequest request)
        {
            var currentUserId = _userContext.GetCurrentUserId();
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();
            var currentUser = await _userManager.FindByIdAsync(currentUserId);
            
            if (currentUser?.CustomerId == null || currentUser.CustomerRole != CustomerRole.Owner)
            {
                return Forbid("Only owners can change user roles");
            }

            var targetUser = await _userManager.FindByIdAsync(userId);
            if (targetUser?.CustomerId != currentUser.CustomerId)
            {
                return NotFound("User not found or not in same customer");
            }

            if (targetUser.Id == currentUserId)
            {
                return BadRequest("Cannot change your own role");
            }

            targetUser.CustomerRole = request.Role;
            await _userManager.UpdateAsync(targetUser);

            return Ok(new { message = "User role updated successfully" });
        }

        [HttpDelete("users/{userId}")]
        public async Task<IActionResult> RemoveUser(string userId)
        {
            var currentUserId = _userContext.GetCurrentUserId();
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();
            var currentUser = await _userManager.FindByIdAsync(currentUserId);
            
            if (currentUser?.CustomerId == null || (currentUser.CustomerRole != CustomerRole.Owner && currentUser.CustomerRole != CustomerRole.Admin))
            {
                return Forbid("Only owners and admins can remove users");
            }

            var targetUser = await _userManager.FindByIdAsync(userId);
            if (targetUser?.CustomerId != currentUser.CustomerId)
            {
                return NotFound("User not found or not in same customer");
            }

            if (targetUser.Id == currentUserId)
            {
                return BadRequest("Cannot remove yourself");
            }

            await _userManager.DeleteAsync(targetUser);
            return Ok(new { message = "User removed successfully" });
        }
    }

    public class UpdateRoleRequest
    {
        public CustomerRole Role { get; set; }
    }
}