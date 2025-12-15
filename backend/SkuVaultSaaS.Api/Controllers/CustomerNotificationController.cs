using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Api.Services;

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

            return Ok(new
            {
                lowStockNotificationsEnabled = customer.LowStockNotificationsEnabled,
                lowStockNotificationEmail = customer.LowStockNotificationEmail,
                lowStockCheckIntervalMinutes = customer.LowStockCheckIntervalMinutes
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