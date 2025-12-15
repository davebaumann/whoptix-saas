using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PackerPerformanceController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PackerPerformanceController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("customer/{customerId}/debug")]
        public async Task<IActionResult> DebugPackerData(int customerId)
        {
            var allMovements = await _context.Transactions
                .Where(t => t.CustomerId == customerId)
                .Select(t => new { t.PerformedBy, t.TransactionDate, t.TransactionType })
                .Take(10)
                .ToListAsync();

            var packerNames = await _context.Transactions
                .Where(t => t.CustomerId == customerId && !string.IsNullOrEmpty(t.PerformedBy))
                .Select(t => t.PerformedBy)
                .Distinct()
                .ToListAsync();

            return Ok(new { allMovements, packerNames });
        }

        [HttpGet("customer/{customerId}/packer/{packerName}")]
        public async Task<IActionResult> GetPackerDetailedPerformance(
            int customerId, 
            string packerName,
            [FromQuery] string? from = null,
            [FromQuery] string? to = null,
            [FromQuery] string period = "day")
        {
            var fromDate = DateTime.TryParse(from, out var f) ? f : DateTime.UtcNow.AddDays(-60);
            var toDate = DateTime.TryParse(to, out var t) ? t : DateTime.UtcNow.AddDays(30);

            // Debug logging
            Console.WriteLine($"Searching for packer: '{packerName}', customerId: {customerId}, from: {fromDate}, to: {toDate}");

            // First check what users exist
            var allUsers = await _context.InventoryMovements
                .Where(t => t.CustomerId == customerId)
                .Select(t => t.PerformedBy)
                .Distinct()
                .ToListAsync();
            Console.WriteLine($"Available users: {string.Join(", ", allUsers)}");

            var transactions = await _context.InventoryMovements
                .Where(t => t.CustomerId == customerId && 
                           t.PerformedBy == packerName &&
                           t.OccurredAtUtc >= fromDate && 
                           t.OccurredAtUtc <= toDate)
                .Select(t => new { TransactionDate = t.OccurredAtUtc, Quantity = t.QuantityChange, t.TransactionType })
                .AsNoTracking()
                .ToListAsync();

            Console.WriteLine($"Found {transactions.Count} transactions for packer {packerName}");

            var performanceData = period switch
            {
                "week" => GroupByWeek(transactions, fromDate, toDate),
                "month" => GroupByMonth(transactions, fromDate, toDate),
                _ => GroupByDay(transactions, fromDate, toDate)
            };

            return Ok(new
            {
                packerName,
                period,
                fromDate,
                toDate,
                performanceData,
                summary = new
                {
                    totalTransactions = transactions.Count,
                    totalQuantity = transactions.Sum(t => Math.Abs(t.Quantity)),
                    pickCount = transactions.Count(t => t.TransactionType == "Pick"),
                    shipCount = transactions.Count(t => t.TransactionType == "Ship"),
                    averagePerDay = transactions.Count / Math.Max(1, (toDate - fromDate).Days)
                }
            });
        }

        private object GroupByDay(IEnumerable<dynamic> transactions, DateTime fromDate, DateTime toDate)
        {
            var grouped = transactions
                .GroupBy(t => t.TransactionDate.Date)
                .Where(g => g.Count() > 0) // Only include days with transactions
                .Select(g => new
                {
                    date = g.Key.ToString("yyyy-MM-dd"),
                    totalTransactions = g.Count(),
                    totalQuantity = g.Sum(t => Math.Abs(t.Quantity)),
                    pickCount = g.Count(t => t.TransactionType == "Pick"),
                    shipCount = g.Count(t => t.TransactionType == "Ship"),
                    receiveCount = g.Count(t => t.TransactionType == "Receive"),
                    otherCount = g.Count(t => t.TransactionType != "Pick" && t.TransactionType != "Ship" && t.TransactionType != "Receive")
                })
                .OrderBy(x => x.date)
                .ToList();

            return grouped;
        }

        private object GroupByWeek(IEnumerable<dynamic> transactions, DateTime fromDate, DateTime toDate)
        {
            var grouped = transactions
                .GroupBy(t => GetWeekStart(t.TransactionDate))
                .Select(g => new
                {
                    weekStart = g.Key.ToString("yyyy-MM-dd"),
                    weekEnd = g.Key.AddDays(6).ToString("yyyy-MM-dd"),
                    totalTransactions = g.Count(),
                    totalQuantity = g.Sum(t => Math.Abs(t.Quantity)),
                    pickCount = g.Count(t => t.TransactionType == "Pick"),
                    shipCount = g.Count(t => t.TransactionType == "Ship"),
                    receiveCount = g.Count(t => t.TransactionType == "Receive"),
                    otherCount = g.Count(t => t.TransactionType != "Pick" && t.TransactionType != "Ship" && t.TransactionType != "Receive")
                })
                .OrderBy(x => x.weekStart)
                .ToList();

            return grouped;
        }

        private object GroupByMonth(IEnumerable<dynamic> transactions, DateTime fromDate, DateTime toDate)
        {
            var grouped = transactions
                .GroupBy(t => new { t.TransactionDate.Year, t.TransactionDate.Month })
                .Select(g => new
                {
                    month = $"{g.Key.Year}-{g.Key.Month:D2}",
                    totalTransactions = g.Count(),
                    totalQuantity = g.Sum(t => Math.Abs(t.Quantity)),
                    pickCount = g.Count(t => t.TransactionType == "Pick"),
                    shipCount = g.Count(t => t.TransactionType == "Ship"),
                    receiveCount = g.Count(t => t.TransactionType == "Receive"),
                    otherCount = g.Count(t => t.TransactionType != "Pick" && t.TransactionType != "Ship" && t.TransactionType != "Receive")
                })
                .OrderBy(x => x.month)
                .ToList();

            return grouped;
        }

        private DateTime GetWeekStart(DateTime date)
        {
            var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
            return date.AddDays(-1 * diff).Date;
        }
    }
}