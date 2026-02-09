using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OptimizedReportsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public OptimizedReportsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("customer/{customerId}/dashboard-summary")]
        public async Task<IActionResult> GetDashboardSummary(int customerId, DateTime? from = null, DateTime? to = null)
        {
            var fromDate = from ?? DateTime.UtcNow.AddDays(-7);
            var toDate = to ?? DateTime.UtcNow;

            // Single optimized query for dashboard KPIs using Transactions table
            var summary = await _context.Transactions
                .Where(t => t.CustomerId == customerId && 
                           t.TransactionDate >= fromDate && 
                           t.TransactionDate <= toDate)
                .GroupBy(t => 1)
                .Select(g => new
                {
                    totalTransactions = g.Count(),
                    totalQuantity = g.Sum(t => Math.Abs(t.Quantity)),
                    pickCount = g.Count(t => t.TransactionType == "Pick"),
                    packCount = g.Count(t => t.TransactionType == "Pack"),
                    receiveCount = g.Count(t => t.TransactionType == "Receive"),
                    activeUsers = g.Select(t => t.PerformedBy).Distinct().Count()
                })
                .AsNoTracking()
                .FirstOrDefaultAsync();

            return Ok(summary ?? new { totalTransactions = 0, totalQuantity = 0, pickCount = 0, packCount = 0, receiveCount = 0, activeUsers = 0 });
        }

        [HttpGet("customer/{customerId}/top-packers")]
        public async Task<IActionResult> GetTopPackers(int customerId, DateTime? from = null, DateTime? to = null, int limit = 10)
        {
            var fromDate = from ?? DateTime.UtcNow.AddDays(-7);
            var toDate = to ?? DateTime.UtcNow;

            // Optimized query for top packers with aggregation in database using Transactions table
            var topPackers = await _context.Transactions
                .Where(t => t.CustomerId == customerId && 
                           t.TransactionDate >= fromDate && 
                           t.TransactionDate <= toDate &&
                           !string.IsNullOrEmpty(t.PerformedBy))
                .GroupBy(t => t.PerformedBy)
                .Select(g => new
                {
                    user = g.Key,
                    totalQuantity = g.Sum(t => Math.Abs(t.Quantity)),
                    pickCount = g.Count(t => t.TransactionType == "Pick"),
                    packCount = g.Count(t => t.TransactionType == "Pack"),
                    totalTransactions = g.Count(),
                    firstActivity = g.Min(t => t.TransactionDate),
                    lastActivity = g.Max(t => t.TransactionDate)
                })
                .OrderByDescending(p => p.totalQuantity)
                .Take(limit)
                .AsNoTracking()
                .ToListAsync();

            return Ok(new { packers = topPackers });
        }

        [HttpGet("customer/{customerId}/low-stock-optimized")]
        public async Task<IActionResult> GetLowStockOptimized(int customerId)
        {
            // Single query with joins for low stock items
            var lowStockItems = await (from inv in _context.InventoryLevels
                                     join prod in _context.Products on inv.ProductId equals prod.Id
                                     where inv.CustomerId == customerId && 
                                           inv.QuantityOnHand <= 10
                                     select new
                                     {
                                         productId = inv.ProductId,
                                         sku = prod.Sku,
                                         currentStock = inv.QuantityOnHand,
                                         threshold = 10,
                                         locationId = inv.LocationId
                                     })
                                     .AsNoTracking()
                                     .ToListAsync();

            return Ok(lowStockItems);
        }

        [HttpGet("customer/{customerId}/daily-activity")]
        public async Task<IActionResult> GetDailyActivity(int customerId, int days = 30)
        {
            var fromDate = DateTime.UtcNow.AddDays(-days).Date;

            // Optimized daily aggregation query using Transactions table
            var dailyActivity = await _context.Transactions
                .Where(t => t.CustomerId == customerId && t.TransactionDate >= fromDate)
                .GroupBy(t => t.TransactionDate.Date)
                .Select(g => new
                {
                    date = g.Key,
                    totalTransactions = g.Count(),
                    totalQuantity = g.Sum(t => Math.Abs(t.Quantity)),
                    pickTransactions = g.Count(t => t.TransactionType == "Pick"),
                    packTransactions = g.Count(t => t.TransactionType == "Pack"),
                    receiveTransactions = g.Count(t => t.TransactionType == "Receive"),
                    otherTransactions = g.Count(t => t.TransactionType != "Pick" && t.TransactionType != "Pack" && t.TransactionType != "Receive")
                })
                .OrderBy(x => x.date)
                .AsNoTracking()
                .ToListAsync();

            return Ok(new { dailyCounts = dailyActivity });
        }
    }
}