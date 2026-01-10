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
        private readonly IConfiguration _configuration;

        public MembershipController(
            ApplicationDbContext context,
            IReportAccessService reportAccessService,
            ILogger<MembershipController> logger,
            IConfiguration configuration)
        {
            _context = context;
            _reportAccessService = reportAccessService;
            _logger = logger;
            _configuration = configuration;
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

                var availableReports = _reportAccessService.GetAvailableReports((int)customer.MembershipLevel);
                var allTiers = GetAllMembershipTiers(customer.MembershipLevel);
                
                // Get pricing info from config
                var priceAmounts = _configuration.GetSection("Stripe:PriceAmounts");
                var tierPriceMap = new Dictionary<int, int>
                {
                    { 2, int.Parse(priceAmounts["standard_monthly"] ?? "99") },
                    { 3, int.Parse(priceAmounts["premium_monthly"] ?? "199") },
                    { 4, int.Parse(priceAmounts["enterprise_monthly"] ?? "299") }
                };
                
                var monthlyCost = tierPriceMap.ContainsKey((int)customer.MembershipLevel) 
                    ? tierPriceMap[(int)customer.MembershipLevel] 
                    : 0;
                
                // For now, renewal is 1 year from when they became active (or today if not tracked)
                // This assumes annual billing - adjust as needed for monthly billing
                var renewalDate = customer.LastSyncedAt.AddYears(1);

                return Ok(new MembershipInfoDto
                {
                    CurrentLevel = customer.MembershipLevel,
                    CurrentLevelName = customer.MembershipLevel.ToString(),
                    AvailableReports = availableReports,
                    AllTiers = allTiers,
                    MonthlyCost = monthlyCost,
                    RenewalDate = renewalDate,
                    IsActive = customer.IsActive
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
                        AvailableReports = _reportAccessService.GetAvailableReports((int)c.MembershipLevel).Count(),
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

        [HttpGet("pricing-config")]
        public IActionResult GetPricingConfig()
        {
            try
            {
                var priceIds = _configuration.GetSection("Stripe:PriceIds");
                var pricingConfig = new PricingConfigDto();
                
                foreach (var child in priceIds.GetChildren())
                {
                    pricingConfig.PriceIds[child.Key] = child.Value ?? string.Empty;
                }
                
                return Ok(pricingConfig);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving pricing configuration");
                return StatusCode(500, "Error retrieving pricing configuration");
            }
        }

        [HttpGet("admin/report-access-config")]
        [Authorize(Roles = "Admin")]
        public IActionResult GetReportAccessConfig()
        {
            var config = _reportAccessService.GetReportAccessConfig();
            return Ok(config);
        }

        [HttpPost("admin/report-access-config")]
        [Authorize(Roles = "Admin")]
        public IActionResult UpdateReportAccessConfig([FromBody] Dictionary<string, int> config)
        {
            try
            {
                _logger.LogInformation("Received config update request. Config is null: {IsNull}", config == null);
                if (config != null)
                {
                    _logger.LogInformation("Config has {Count} entries: {Config}", config.Count, string.Join(", ", config.Select(kvp => $"{kvp.Key}={kvp.Value}")));
                }

                if (config == null || !config.Any())
                {
                    _logger.LogWarning("Configuration data is null or empty");
                    return BadRequest("Configuration data is required");
                }

                _reportAccessService.SetReportAccessConfig(config);
                _logger.LogInformation("Report access configuration updated successfully with {Count} entries", config.Count);
                return Ok(new { message = "Report access config updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating report access configuration");
                return StatusCode(500, "Error updating report access configuration");
            }
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