using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Api.Services;
using SkuVaultSaaS.Core.Enums;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Infrastructure.Data;
using System.Security.Claims;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserInvitationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly UserContextService _userContext;

        public UserInvitationController(ApplicationDbContext context, UserManager<ApplicationUser> userManager, UserContextService userContext)
        {
            _context = context;
            _userManager = userManager;
            _userContext = userContext;
        }

        [HttpPost("invite")]
        public async Task<IActionResult> InviteUser([FromBody] InviteUserRequest request)
        {
            var currentUserId = _userContext.GetCurrentUserId();
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();
            var currentUser = await _userManager.FindByIdAsync(currentUserId);
            
            if (currentUser?.CustomerId == null || (currentUser.CustomerRole != CustomerRole.Owner && currentUser.CustomerRole != CustomerRole.Admin))
            {
                return Forbid("Only owners and admins can invite users");
            }

            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return BadRequest("User with this email already exists");
            }

            var existingInvitation = await _context.UserInvitations
                .FirstOrDefaultAsync(ui => ui.Email == request.Email && ui.CustomerId == currentUser.CustomerId && !ui.IsAccepted);
            
            if (existingInvitation != null)
            {
                return BadRequest("Invitation already sent to this email");
            }

            var invitation = new UserInvitation
            {
                CustomerId = currentUser.CustomerId.Value,
                Email = request.Email,
                Role = request.Role,
                InvitationToken = Guid.NewGuid().ToString(),
                InvitedByUserId = currentUser.Id,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };

            _context.UserInvitations.Add(invitation);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Invitation sent successfully", invitationId = invitation.Id });
        }

        [HttpGet("accept/{token}")]
        [AllowAnonymous]
        public async Task<IActionResult> AcceptInvitation(string token)
        {
            var invitation = await _context.UserInvitations
                .Include(ui => ui.Customer)
                .FirstOrDefaultAsync(ui => ui.InvitationToken == token && !ui.IsAccepted && ui.ExpiresAt > DateTime.UtcNow);

            if (invitation == null)
            {
                return BadRequest("Invalid or expired invitation");
            }

            return Ok(new { 
                email = invitation.Email, 
                customerName = invitation.Customer.Name,
                role = invitation.Role.ToString(),
                token = token
            });
        }

        [HttpPost("complete")]
        [AllowAnonymous]
        public async Task<IActionResult> CompleteInvitation([FromBody] CompleteInvitationRequest request)
        {
            var invitation = await _context.UserInvitations
                .FirstOrDefaultAsync(ui => ui.InvitationToken == request.Token && !ui.IsAccepted && ui.ExpiresAt > DateTime.UtcNow);

            if (invitation == null)
            {
                return BadRequest("Invalid or expired invitation");
            }

            var user = new ApplicationUser
            {
                UserName = request.Email,
                Email = request.Email,
                EmailConfirmed = true,
                CustomerId = invitation.CustomerId,
                CustomerRole = invitation.Role
            };

            var result = await _userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            invitation.IsAccepted = true;
            invitation.AcceptedAt = DateTime.UtcNow;
            invitation.AcceptedByUserId = user.Id;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Account created successfully" });
        }

        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingInvitations()
        {
            var currentUserId = _userContext.GetCurrentUserId();
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();
            var currentUser = await _userManager.FindByIdAsync(currentUserId);
            
            if (currentUser?.CustomerId == null)
            {
                return BadRequest("User not associated with a customer");
            }

            var invitations = await _context.UserInvitations
                .Where(ui => ui.CustomerId == currentUser.CustomerId && !ui.IsAccepted)
                .Include(ui => ui.InvitedBy)
                .Select(ui => new {
                    ui.Id,
                    ui.Email,
                    ui.Role,
                    ui.CreatedAt,
                    ui.ExpiresAt,
                    InvitedBy = ui.InvitedBy.Email
                })
                .ToListAsync();

            return Ok(invitations);
        }
    }

    public class InviteUserRequest
    {
        public string Email { get; set; } = null!;
        public CustomerRole Role { get; set; }
    }

    public class CompleteInvitationRequest
    {
        public string Token { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
    }
}