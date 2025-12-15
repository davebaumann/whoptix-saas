using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class UsageAnalyticsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<UsageAnalyticsController> _logger;

        public UsageAnalyticsController(ApplicationDbContext context, ILogger<UsageAnalyticsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsageAnalytics([FromQuery] int days = 30)
        {
            try
            {
                // Simple test version
                var customers = await _context.Customers.ToListAsync();
                
                var result = new
                {
                    period = $"Last {days} days",
                    summary = new
                    {
                        totalCustomers = customers.Count,
                        activeCustomers = customers.Count,
                        totalTransactions = 0,
                        averageTransactionsPerCustomer = 0.0
                    },
                    membershipDistribution = customers
                        .GroupBy(c => c.MembershipLevel.ToString())
                        .Select(g => new
                        {
                            Level = g.Key,
                            Count = g.Count(),
                            Percentage = Math.Round((double)g.Count() / customers.Count * 100, 1)
                        })
                        .ToList(),
                    topCustomersByActivity = customers.Take(5).Select(c => new
                    {
                        Id = c.Id,
                        Name = c.Name,
                        Email = c.Email,
                        MembershipLevel = c.MembershipLevel.ToString(),
                        TransactionCount = 0
                    }).ToList(),
                    activityTrends = new List<object>()
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting usage analytics: {Message}", ex.Message);
                return StatusCode(500, new { error = ex.Message });
            }
        }

        private async Task<object> GetActivityTrends(int days)
        {
            var startDate = DateTime.UtcNow.AddDays(-days);
            
            var dailyActivity = await _context.Transactions
                .Where(t => t.TransactionDate >= startDate)
                .GroupBy(t => t.TransactionDate.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    TransactionCount = g.Count(),
                    UniqueCustomers = g.Select(t => t.CustomerId).Distinct().Count()
                })
                .OrderBy(x => x.Date)
                .ToListAsync();

            // Format dates after retrieving from database
            return dailyActivity.Select(d => new
            {
                Date = d.Date.ToString("yyyy-MM-dd"),
                d.TransactionCount,
                d.UniqueCustomers
            }).ToList();
        }
    }

    public class CustomerUsageDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string Email { get; set; } = "";
        public string MembershipLevel { get; set; } = "";
        public DateTime? LastSyncedAt { get; set; }
        public int ProductCount { get; set; }
        public int LocationCount { get; set; }
        public int TransactionCount { get; set; }
    }
}