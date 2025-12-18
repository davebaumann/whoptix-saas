using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Api.Services;
using SkuVaultSaaS.Core.Enums;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Infrastructure.Services;
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
        private readonly SkuVaultSaaS.Api.Services.IEmailService _emailService;

        public UserInvitationController(ApplicationDbContext context, UserManager<ApplicationUser> userManager, UserContextService userContext, SkuVaultSaaS.Api.Services.IEmailService emailService)
        {
            _context = context;
            _userManager = userManager;
            _userContext = userContext;
            _emailService = emailService;
        }

        [HttpPost("invite")]
        public async Task<IActionResult> InviteUser([FromBody] InviteUserRequestWrapper request)
        {
            var inviteRequest = request.Request;
            var currentUserId = _userContext.GetCurrentUserId();
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();
            var currentUser = await _userManager.FindByIdAsync(currentUserId);
            
            if (currentUser?.CustomerId == null || (currentUser.CustomerRole != CustomerRole.Owner && currentUser.CustomerRole != CustomerRole.Admin))
            {
                return Forbid("Only owners and admins can invite users");
            }

            var existingUser = await _userManager.FindByEmailAsync(inviteRequest.Email);
            
            // Check if this user is already connected to this customer
            if (existingUser?.CustomerId == currentUser.CustomerId)
            {
                return BadRequest("User is already a member of this customer account");
            }

            var existingInvitation = await _context.UserInvitations
                .FirstOrDefaultAsync(ui => ui.Email == inviteRequest.Email && ui.CustomerId == currentUser.CustomerId && !ui.IsAccepted);
            
            if (existingInvitation != null)
            {
                return BadRequest("Invitation already sent to this email");
            }

            var customer = await _context.Customers.FindAsync(currentUser.CustomerId.Value);
            if (customer == null)
            {
                return BadRequest("Customer not found");
            }

            var invitation = new UserInvitation
            {
                CustomerId = currentUser.CustomerId.Value,
                Email = inviteRequest.Email,
                Role = inviteRequest.Role,
                InvitationToken = Guid.NewGuid().ToString(),
                InvitedByUserId = currentUser.Id,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };

            _context.UserInvitations.Add(invitation);
            await _context.SaveChangesAsync();

            // Send invitation email
            var inviteLink = $"{Request.Scheme}://{Request.Host}/api/userinvitation/accept/{invitation.InvitationToken}";
            await _emailService.SendInvitationEmailAsync(invitation.Email, currentUser.Email!, customer.Name, inviteLink);

            return Ok(new { message = "Invitation sent successfully", invitationId = invitation.Id });
        }

        [HttpGet("check-email/{email}")]
        [AllowAnonymous]
        public async Task<IActionResult> CheckEmailExists(string email)
        {
            var user = await _userManager.FindByEmailAsync(email);
            return Ok(new { exists = user != null });
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
                return Redirect("/accept-invitation?error=invalid");
            }

            // Redirect to frontend accept invitation page with token
            return Redirect($"/accept-invitation?token={Uri.EscapeDataString(token)}&email={Uri.EscapeDataString(invitation.Email)}&customer={Uri.EscapeDataString(invitation.Customer.Name)}&role={Uri.EscapeDataString(invitation.Role.ToString())}");
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

            // Check if user already exists
            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            
            if (existingUser != null)
            {
                // User already exists, just connect them to the customer account
                existingUser.CustomerId = invitation.CustomerId;
                existingUser.CustomerRole = invitation.Role;
                var updateResult = await _userManager.UpdateAsync(existingUser);
                if (!updateResult.Succeeded)
                {
                    return BadRequest("Failed to connect account to customer");
                }
            }
            else
            {
                // New user, create account with provided password
                var newUser = new ApplicationUser
                {
                    UserName = request.Email,
                    Email = request.Email,
                    EmailConfirmed = true,
                    CustomerId = invitation.CustomerId,
                    CustomerRole = invitation.Role
                };

                var createResult = await _userManager.CreateAsync(newUser, request.Password);
                if (!createResult.Succeeded)
                {
                    return BadRequest(string.Join(", ", createResult.Errors.Select(e => e.Description)));
                }
            }

            // Mark invitation as accepted
            invitation.IsAccepted = true;
            invitation.AcceptedAt = DateTime.UtcNow;
            invitation.AcceptedByUserId = existingUser?.Id ?? (await _userManager.FindByEmailAsync(request.Email))?.Id;
            await _context.SaveChangesAsync();

            return Ok(new { message = existingUser != null ? "Account connected successfully" : "Account created successfully" });
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

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInvitation(int id)
        {
            var currentUserId = _userContext.GetCurrentUserId();
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();
            var currentUser = await _userManager.FindByIdAsync(currentUserId);

            if (currentUser?.CustomerId == null)
            {
                return BadRequest("User not associated with a customer");
            }

            var invitation = await _context.UserInvitations.FindAsync(id);
            if (invitation == null)
            {
                return NotFound("Invitation not found");
            }

            if (invitation.CustomerId != currentUser.CustomerId)
            {
                return Forbid("You can only delete invitations from your own customer account");
            }

            _context.UserInvitations.Remove(invitation);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Invitation deleted successfully" });
        }

        [HttpGet("customer-users")]
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
                    userId = u.Id,
                    userEmail = u.Email,
                    customerRole = u.CustomerRole.ToString(),
                    dateAdded = DateTime.UtcNow // Use current time as we don't have a CreatedDate field
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpPut("customer-users/{userId}")]
        public async Task<IActionResult> UpdateCustomerUser(string userId, [FromBody] UpdateCustomerUserRequest request)
        {
            var currentUserId = _userContext.GetCurrentUserId();
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();
            var currentUser = await _userManager.FindByIdAsync(currentUserId);

            if (currentUser?.CustomerId == null || (currentUser.CustomerRole != CustomerRole.Owner && currentUser.CustomerRole != CustomerRole.Admin))
            {
                return Forbid("Only owners and admins can update user roles");
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound("User not found");
            }

            if (user.CustomerId != currentUser.CustomerId)
            {
                return Forbid("You can only update users in your own customer account");
            }

            user.CustomerRole = request.CustomerRole;
            var result = await _userManager.UpdateAsync(user);
            
            if (!result.Succeeded)
            {
                return BadRequest(string.Join(", ", result.Errors.Select(e => e.Description)));
            }

            return Ok(new { message = "User role updated successfully" });
        }

        [HttpDelete("customer-users/{userId}")]
        public async Task<IActionResult> DeleteCustomerUser(string userId)
        {
            var currentUserId = _userContext.GetCurrentUserId();
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();
            var currentUser = await _userManager.FindByIdAsync(currentUserId);

            if (currentUser?.CustomerId == null || (currentUser.CustomerRole != CustomerRole.Owner && currentUser.CustomerRole != CustomerRole.Admin))
            {
                return Forbid("Only owners and admins can remove users from the account");
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound("User not found");
            }

            if (user.CustomerId != currentUser.CustomerId)
            {
                return Forbid("You can only remove users from your own customer account");
            }

            // Disconnect user from customer (don't delete the user account)
            user.CustomerId = null;
            user.CustomerRole = null;
            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                return BadRequest(string.Join(", ", result.Errors.Select(e => e.Description)));
            }

            return Ok(new { message = "User removed from account successfully" });
        }
    }

    public class InviteUserRequest
    {
        public string Email { get; set; } = null!;
        public CustomerRole Role { get; set; }
    }

    public class InviteUserRequestWrapper
    {
        [System.Text.Json.Serialization.JsonPropertyName("request")]
        public InviteUserRequest Request { get; set; } = null!;
    }

    public class CompleteInvitationRequest
    {
        public string Token { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
    }

    public class UpdateCustomerUserRequest
    {
        public CustomerRole CustomerRole { get; set; }
    }
}