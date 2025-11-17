using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Core.Enums;
using SkuVaultSaaS.Core.Services;
using SkuVaultSaaS.Api.Models;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MembershipController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IReportAccessService _reportAccessService;
        private readonly ILogger<MembershipController> _logger;

        public MembershipController(
            ApplicationDbContext context,
            IReportAccessService reportAccessService,
            ILogger<MembershipController> logger)
        {
            _context = context;
            _reportAccessService = reportAccessService;
            _logger = logger;
        }

        [HttpGet("customer/{customerId}")]
        public async Task<IActionResult> GetMembershipInfo(int customerId)
        {
            try
            {
                var customer = await _context.Customers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(c => c.Id == customerId);

                if (customer == null)
                {
                    return NotFound("Customer not found");
                }

                var availableReports = _reportAccessService.GetAvailableReports(customer.MembershipLevel);

                var allTiers = GetAllMembershipTiers(customer.MembershipLevel);

                return Ok(new MembershipInfoDto
                {
                    CurrentLevel = customer.MembershipLevel,
                    CurrentLevelName = customer.MembershipLevel.ToString(),
                    AvailableReports = availableReports,
                    AllTiers = allTiers
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting membership info for customer {CustomerId}", customerId);
                return StatusCode(500, "Error retrieving membership information");
            }
        }

        [HttpPost("admin/update")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateMembership([FromBody] UpdateMembershipRequest request)
        {
            try
            {
                var customer = await _context.Customers.FindAsync(request.CustomerId);
                if (customer == null)
                {
                    return NotFound("Customer not found");
                }

                var oldLevel = customer.MembershipLevel;
                customer.MembershipLevel = request.NewLevel;
                
                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "Customer {CustomerId} membership updated from {OldLevel} to {NewLevel}. Reason: {Reason}",
                    request.CustomerId, oldLevel, request.NewLevel, request.Reason ?? "No reason provided");

                return Ok(new
                {
                    message = "Membership level updated successfully",
                    customerId = request.CustomerId,
                    oldLevel = oldLevel.ToString(),
                    newLevel = request.NewLevel.ToString(),
                    reason = request.Reason
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating membership for customer {CustomerId}", request.CustomerId);
                return StatusCode(500, "Error updating membership level");
            }
        }

        [HttpGet("admin/customers")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllCustomersWithMembership()
        {
            try
            {
                var customers = await _context.Customers
                    .AsNoTracking()
                    .Select(c => new
                    {
                        c.Id,
                        c.Name,
                        c.Email,
                        MembershipLevel = c.MembershipLevel,
                        MembershipLevelName = c.MembershipLevel.ToString(),
                        AvailableReports = _reportAccessService.GetAvailableReports(c.MembershipLevel).Count(),
                        c.LastSyncedAt
                    })
                    .OrderBy(c => c.Name)
                    .ToListAsync();

                return Ok(customers);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting customers with membership info");
                return StatusCode(500, "Error retrieving customer membership information");
            }
        }

        [HttpGet("tiers")]
        public IActionResult GetMembershipTiers()
        {
            var tiers = GetAllMembershipTiers(null);
            return Ok(tiers);
        }

        private IEnumerable<MembershipTierDto> GetAllMembershipTiers(MembershipLevel? currentLevel)
        {
            return new[]
            {
                new MembershipTierDto
                {
                    Level = MembershipLevel.Basic,
                    Name = "Basic",
                    Description = "Essential inventory tracking",
                    Features = new[] { "Basic Inventory Report", "Real-time stock levels", "Product management" },
                    IsCurrentTier = currentLevel == MembershipLevel.Basic,
                    CanUpgrade = currentLevel == null || currentLevel < MembershipLevel.Basic
                },
                new MembershipTierDto
                {
                    Level = MembershipLevel.Standard,
                    Name = "Standard",
                    Description = "Enhanced inventory management with alerts",
                    Features = new[] { "All Basic features", "Low Stock Alerts", "Email notifications", "Threshold management" },
                    IsCurrentTier = currentLevel == MembershipLevel.Standard,
                    CanUpgrade = currentLevel == null || currentLevel < MembershipLevel.Standard
                },
                new MembershipTierDto
                {
                    Level = MembershipLevel.Premium,
                    Name = "Premium",
                    Description = "Advanced analytics and reporting",
                    Features = new[] { "All Standard features", "Aging Inventory Reports", "Financial Warehouse Analysis", "Location Optimization", "Advanced analytics" },
                    IsCurrentTier = currentLevel == MembershipLevel.Premium,
                    CanUpgrade = currentLevel == null || currentLevel < MembershipLevel.Premium
                },
                new MembershipTierDto
                {
                    Level = MembershipLevel.Enterprise,
                    Name = "Enterprise",
                    Description = "Complete business intelligence suite",
                    Features = new[] { "All Premium features", "Performance Analytics", "Velocity Tracking", "Turnover Analysis", "Growth Trends", "Top Performers", "Comprehensive insights" },
                    IsCurrentTier = currentLevel == MembershipLevel.Enterprise,
                    CanUpgrade = false // Can't upgrade beyond Enterprise
                }
            };
        }
    }
}