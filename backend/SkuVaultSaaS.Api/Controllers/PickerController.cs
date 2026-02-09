using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PickerController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PickerController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("customer/{customerId}/summary")]
        public async Task<IActionResult> GetPickerSummary(int customerId, [FromQuery] string period = "today")
        {
            // Validate customer ID to prevent injection
            if (!SkuVaultSaaS.Api.Utilities.ValidationHelper.ValidateCustomerId(customerId))
            {
                return BadRequest(SkuVaultSaaS.Api.Models.ErrorResponse.BadRequest("Invalid customer ID."));
            }

            var fromDate = period switch
            {
                "today" => DateTime.UtcNow.Date,
                "week" => DateTime.UtcNow.AddDays(-7),
                "month" => DateTime.UtcNow.AddDays(-30),
                _ => DateTime.UtcNow.Date
            };

            var pickerSummary = await _context.Transactions
                .Where(t => t.CustomerId == customerId && 
                           !string.IsNullOrEmpty(t.PerformedBy) &&
                           t.TransactionDate >= fromDate)
                .GroupBy(t => t.PerformedBy)
                .Select(g => new
                {
                    pickerName = g.Key,
                    totalTransactions = g.Count(),
                    pickCount = g.Count(t => t.TransactionType == "Pick"),
                    removeCount = g.Count(t => t.TransactionType == "Remove"),
                    addCount = g.Count(t => t.TransactionType == "Add"),
                    createCount = g.Count(t => t.TransactionType == "Create"),
                    totalQuantity = g.Sum(t => Math.Abs(t.Quantity)),
                    pickQuantity = g.Where(t => t.TransactionType == "Pick").Sum(t => Math.Abs(t.Quantity)),
                    hoursWorked = (g.Max(t => t.TransactionDate) - g.Min(t => t.TransactionDate)).TotalHours,
                    firstTransaction = g.Min(t => t.TransactionDate),
                    lastTransaction = g.Max(t => t.TransactionDate)
                })
                .AsNoTracking()
                .ToListAsync();

            // Calculate performance metrics and sort by pick rate (high to low)
            var sortedSummary = pickerSummary
                .Select(p => new
                {
                    p.pickerName,
                    p.totalTransactions,
                    p.pickCount,
                    p.removeCount,
                    p.addCount,
                    p.createCount,
                    p.totalQuantity,
                    p.pickQuantity,
                    p.hoursWorked,
                    p.firstTransaction,
                    p.lastTransaction,
                    pickRate = p.hoursWorked > 0 ? p.pickQuantity / p.hoursWorked : 0,
                    transactionRate = p.hoursWorked > 0 ? p.totalTransactions / p.hoursWorked : 0
                })
                .OrderByDescending(p => p.pickRate)
                .ThenByDescending(p => p.pickQuantity)
                .ToList();

            return Ok(new { period, fromDate, pickers = sortedSummary });
        }

        [HttpGet("customer/{customerId}/debug")]
        public async Task<IActionResult> DebugPickerData(int customerId)
        {
            var transactionTypes = await _context.Transactions
                .Where(t => t.CustomerId == customerId)
                .GroupBy(t => t.TransactionType)
                .Select(g => new { TransactionType = g.Key, Count = g.Count() })
                .ToListAsync();

            var pickerNames = await _context.Transactions
                .Where(t => t.CustomerId == customerId && !string.IsNullOrEmpty(t.PerformedBy))
                .Select(t => t.PerformedBy)
                .Distinct()
                .ToListAsync();

            var sampleMovements = await _context.Transactions
                .Where(t => t.CustomerId == customerId)
                .Select(t => new { t.PerformedBy, t.TransactionDate, t.TransactionType })
                .Take(20)
                .ToListAsync();

            return Ok(new { transactionTypes, pickerNames, sampleMovements });
        }

        [HttpGet("customer/{customerId}/picker/{pickerName}")]
        public async Task<IActionResult> GetPickerDetailedPerformance(
            int customerId, 
            string pickerName,
            [FromQuery] string? from = null,
            [FromQuery] string? to = null,
            [FromQuery] string period = "day")
        {
            // Validate customer ID to prevent injection
            if (!SkuVaultSaaS.Api.Utilities.ValidationHelper.ValidateCustomerId(customerId))
            {
                return BadRequest(SkuVaultSaaS.Api.Models.ErrorResponse.BadRequest("Invalid customer ID."));
            }

            var fromDate = DateTime.TryParse(from, out var f) ? f : DateTime.UtcNow.AddDays(-60);
            var toDate = DateTime.TryParse(to, out var t) ? t : DateTime.UtcNow.AddDays(30);

            // Validate date range if both are provided
            if (DateTime.TryParse(from, out _) && DateTime.TryParse(to, out _))
            {
                var (isValid, errorMessage) = SkuVaultSaaS.Api.Utilities.ValidationHelper.ValidateDateRange(fromDate, toDate);
                if (!isValid)
                {
                    return BadRequest(SkuVaultSaaS.Api.Models.ErrorResponse.BadRequest(errorMessage));
                }
            }

            // Adjust date range based on period to get meaningful data
            if (period == "week")
            {
                // For week view, expand to show 7 days of data
                fromDate = fromDate.AddDays(-6);
            }
            else if (period == "month")
            {
                // For month view, expand to show 30 days of data
                fromDate = fromDate.AddDays(-29);
            }

            // Debug logging
            Console.WriteLine($"Searching for picker: '{pickerName}', customerId: {customerId}, from: {fromDate}, to: {toDate}");

            // First check what users exist in Transactions table
            var allUsers = await _context.Transactions
                .Where(t => t.CustomerId == customerId)
                .Select(t => t.PerformedBy)
                .Distinct()
                .ToListAsync();
            Console.WriteLine($"Available users: {string.Join(", ", allUsers)}");

            var transactions = await _context.Transactions
                .Where(t => t.CustomerId == customerId && 
                           t.PerformedBy == pickerName &&
                           t.TransactionDate >= fromDate && 
                           t.TransactionDate <= toDate)
                .Select(t => new { TransactionDate = t.TransactionDate, Quantity = t.Quantity, t.TransactionType })
                .AsNoTracking()
                .ToListAsync();

            Console.WriteLine($"Found {transactions.Count} transactions for picker {pickerName}");

            var performanceData = period switch
            {
                "week" => GroupByWeek(transactions, fromDate, toDate),
                "month" => GroupByMonth(transactions, fromDate, toDate),
                _ => GroupByDay(transactions, fromDate, toDate)
            };

            return Ok(new
            {
                pickerName,
                period,
                fromDate,
                toDate,
                performanceData,
                summary = new
                {
                    totalTransactions = transactions.Count,
                    totalQuantity = transactions.Sum(t => Math.Abs(t.Quantity)),
                    pickCount = transactions.Count(t => t.TransactionType == "Pick"),
                    removeCount = transactions.Count(t => t.TransactionType == "Remove"),
                    averagePerDay = transactions.Count / Math.Max(1, (toDate - fromDate).Days)
                }
            });
        }

        private object GroupByDay(IEnumerable<dynamic> transactions, DateTime fromDate, DateTime toDate)
        {
            // For daily view, group by hour to show hourly performance
            var grouped = transactions
                .GroupBy(t => new { t.TransactionDate.Date, t.TransactionDate.Hour })
                .Select(g => new
                {
                    hour = g.Key.Hour,
                    date = g.Key.Date.ToString("yyyy-MM-dd"),
                    name = $"{g.Key.Hour:D2}:00",
                    totalTransactions = g.Count(),
                    totalQuantity = g.Sum(t => Math.Abs(t.Quantity)),
                    pickCount = g.Count(t => t.TransactionType == "Pick"),
                    removeCount = g.Count(t => t.TransactionType == "Remove"),
                    addCount = g.Count(t => t.TransactionType == "Add"),
                    createCount = g.Count(t => t.TransactionType == "Create")
                })
                .OrderBy(x => x.date).ThenBy(x => x.hour)
                .ToList();

            return grouped;
        }

        private object GroupByWeek(IEnumerable<dynamic> transactions, DateTime fromDate, DateTime toDate)
        {
            // For weekly view, group by day to show daily performance over the week period
            var grouped = transactions
                .GroupBy(t => t.TransactionDate.Date)
                .Select(g => new
                {
                    date = g.Key.ToString("yyyy-MM-dd"),
                    name = g.Key.ToString("MMM dd"),
                    totalTransactions = g.Count(),
                    totalQuantity = g.Sum(t => Math.Abs(t.Quantity)),
                    pickCount = g.Count(t => t.TransactionType == "Pick"),
                    removeCount = g.Count(t => t.TransactionType == "Remove"),
                    addCount = g.Count(t => t.TransactionType == "Add"),
                    createCount = g.Count(t => t.TransactionType == "Create")
                })
                .OrderBy(x => x.date)
                .ToList();

            return grouped;
        }

        private object GroupByMonth(IEnumerable<dynamic> transactions, DateTime fromDate, DateTime toDate)
        {
            // For monthly view, group by day to show daily performance over the month period
            var grouped = transactions
                .GroupBy(t => t.TransactionDate.Date)
                .Select(g => new
                {
                    date = g.Key.ToString("yyyy-MM-dd"),
                    name = g.Key.ToString("MMM dd"),
                    totalTransactions = g.Count(),
                    totalQuantity = g.Sum(t => Math.Abs(t.Quantity)),
                    pickCount = g.Count(t => t.TransactionType == "Pick"),
                    removeCount = g.Count(t => t.TransactionType == "Remove"),
                    addCount = g.Count(t => t.TransactionType == "Add"),
                    createCount = g.Count(t => t.TransactionType == "Create")
                })
                .OrderBy(x => x.date)
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