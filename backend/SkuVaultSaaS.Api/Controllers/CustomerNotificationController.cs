using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Api.Services;
using SkuVaultSaaS.Core.Enums;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CustomerNotificationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserContextService _userContextService;

        public CustomerNotificationController(ApplicationDbContext context, UserContextService userContextService)
        {
            _context = context;
            _userContextService = userContextService;
        }

        [HttpGet("{customerId}")]
        public async Task<IActionResult> GetNotificationPreferences(int customerId)
        {
            if (!await _userContextService.CanAccessCustomerAsync(customerId))
            {
                return Forbid();
            }

            var customer = await _context.Customers.FindAsync(customerId);
            if (customer == null)
            {
                return NotFound();
            }

            // Check if customer has permission to view low stock notification settings
            bool canEnableNotifications = customer.MembershipLevel >= MembershipLevel.Premium;

            return Ok(new
            {
                lowStockNotificationsEnabled = customer.LowStockNotificationsEnabled,
                lowStockNotificationEmail = customer.LowStockNotificationEmail,
                lowStockCheckIntervalMinutes = customer.LowStockCheckIntervalMinutes,
                canEnableNotifications = canEnableNotifications,
                membershipLevel = customer.MembershipLevel.ToString()
            });
        }

        [HttpPut("{customerId}")]
        public async Task<IActionResult> UpdateNotificationPreferences(int customerId, [FromBody] UpdateNotificationPreferencesRequest request)
        {
            if (!await _userContextService.CanAccessCustomerAsync(customerId))
            {
                return Forbid();
            }

            var customer = await _context.Customers.FindAsync(customerId);
            if (customer == null)
            {
                return NotFound();
            }

            // Only Premium tier and above can enable low stock notifications
            if (request.LowStockNotificationsEnabled && customer.MembershipLevel < MembershipLevel.Premium)
            {
                return BadRequest(new 
                { 
                    message = "Low stock email notifications require Premium membership tier or higher. Please upgrade your membership to enable this feature.",
                    requiredTier = "Premium",
                    currentTier = customer.MembershipLevel.ToString()
                });
            }

            customer.LowStockNotificationsEnabled = request.LowStockNotificationsEnabled;
            customer.LowStockNotificationEmail = request.LowStockNotificationEmail;
            customer.LowStockCheckIntervalMinutes = request.LowStockCheckIntervalMinutes;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Notification preferences updated successfully" });
        }
    }

    public class UpdateNotificationPreferencesRequest
    {
        public bool LowStockNotificationsEnabled { get; set; }
        public string? LowStockNotificationEmail { get; set; }
        public int LowStockCheckIntervalMinutes { get; set; }
    }
}