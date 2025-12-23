using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class TransactionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<TransactionsController> _logger;

        public TransactionsController(ApplicationDbContext context, ILogger<TransactionsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // List transactions for a customer within a date range (basic paging)
        [HttpGet("customer/{customerId}")]
        public async Task<IActionResult> GetTransactions(int customerId, [FromQuery] string? from = null, [FromQuery] string? to = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 100)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 1000) pageSize = 100;

            _logger.LogInformation("GetTransactions raw params: from={From}, to={To}", from, to);

            // Parse dates from query string (handle both ISO 8601 and simple date formats)
            DateTime? fromDate = null;
            DateTime? toDate = null;

            if (!string.IsNullOrEmpty(from))
            {
                // Try exact formats first with AssumeUniversal for UTC interpretation
                if (DateTime.TryParseExact(from, new[] { "yyyy-MM-dd'Z'", "yyyy-MM-ddTHH:mm:ss'Z'", "yyyy-MM-dd", "yyyy-MM-ddTHH:mm:ss" }, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal, out var parsedFrom))
                {
                    fromDate = parsedFrom;
                }
                else
                {
                    // Fallback to general parse
                    if (DateTime.TryParse(from, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal, out var parsedFrom2))
                    {
                        fromDate = parsedFrom2;
                    }
                }
            }

            if (!string.IsNullOrEmpty(to))
            {
                // Try exact formats first with AssumeUniversal for UTC interpretation
                if (DateTime.TryParseExact(to, new[] { "yyyy-MM-dd'Z'", "yyyy-MM-ddTHH:mm:ss'Z'", "yyyy-MM-dd", "yyyy-MM-ddTHH:mm:ss" }, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal, out var parsedTo))
                {
                    toDate = parsedTo;
                }
                else
                {
                    // Fallback to general parse
                    if (DateTime.TryParse(to, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal, out var parsedTo2))
                    {
                        toDate = parsedTo2;
                    }
                }
            }

            // Default to today's UTC range when not provided
            if (fromDate == null && toDate == null)
            {
                (fromDate, toDate) = GetUtcDayRange(DateTime.UtcNow);
            }

            _logger.LogInformation("GetTransactions parsed: customerId={CustomerId}, from={From}, to={To}", customerId, fromDate, toDate);

            var query = _context.InventoryMovements.AsNoTracking().Where(t => t.CustomerId == customerId);
            
            // Check all data first
            var allData = await _context.InventoryMovements.AsNoTracking()
                .Where(t => t.CustomerId == customerId)
                .Select(t => new { t.OccurredAtUtc, Kind = t.OccurredAtUtc.Kind })
                .ToListAsync();
            
            _logger.LogInformation("All data for customer {CustomerId}: {Count} total records", customerId, allData.Count);
            if (allData.Any())
            {
                var distinctDates = allData.Select(x => x.OccurredAtUtc.Date).Distinct().OrderBy(d => d).ToList();
                _logger.LogInformation("Dates in database: {Dates}", string.Join(", ", distinctDates.Select(d => d.ToString("yyyy-MM-dd"))));
                _logger.LogInformation("Min date: {Min}, Max date: {Max}", allData.Min(x => x.OccurredAtUtc), allData.Max(x => x.OccurredAtUtc));
            }
            
            if (fromDate != null) 
            {
                _logger.LogInformation("Applying filter: OccurredAtUtc >= {FromDate}", fromDate);
                query = query.Where(t => t.OccurredAtUtc >= fromDate);
            }
            if (toDate != null)
            {
                _logger.LogInformation("Applying filter: OccurredAtUtc <= {ToDate}", toDate);
                query = query.Where(t => t.OccurredAtUtc <= toDate);
            }

            var total = await query.CountAsync();
            _logger.LogInformation("GetTransactions: Found {Count} total transactions in date range", total);

            var items = await query
                .OrderByDescending(t => t.OccurredAtUtc)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    t.Id,
                    Sku = t.Product.Sku,
                    t.QuantityChange,
                    t.TransactionType,
                    t.Reason,
                    t.PerformedBy,
                    t.Reference,
                    t.Context,
                    t.OccurredAtUtc
                })
                .ToListAsync();

            _logger.LogInformation("GetTransactions: Returning {Count} items on page {Page}", items.Count, page);

            return Ok(new { transactions = items, totalCount = total, page, pageSize });
        }

        // Convenience: list transactions for today (UTC)
        [HttpGet("customer/{customerId}/today")]
        public Task<IActionResult> GetTransactionsToday(int customerId, [FromQuery] int page = 1, [FromQuery] int pageSize = 100)
        {
            var (from, to) = GetUtcDayRange(DateTime.UtcNow);
            return GetTransactions(customerId, from.ToString("yyyy-MM-dd"), to.ToString("yyyy-MM-ddTHH:mm:ss"), page, pageSize);
        }

        // Summary by user/type within a date range for dashboard
        [HttpGet("customer/{customerId}/summary")]
        public async Task<IActionResult> GetSummary(int customerId, [FromQuery] string? from = null, [FromQuery] string? to = null)
        {
            _logger.LogInformation("GetSummary raw params: from={From}, to={To}", from, to);

            // Parse dates from query string (handle both ISO 8601 and simple date formats)
            DateTime? fromDate = null;
            DateTime? toDate = null;

            if (!string.IsNullOrEmpty(from))
            {
                // Try exact formats first with AssumeUniversal for UTC interpretation
                if (DateTime.TryParseExact(from, new[] { "yyyy-MM-dd'Z'", "yyyy-MM-ddTHH:mm:ss'Z'", "yyyy-MM-dd", "yyyy-MM-ddTHH:mm:ss" }, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal, out var parsedFrom))
                {
                    fromDate = parsedFrom;
                }
                else
                {
                    // Fallback to general parse
                    if (DateTime.TryParse(from, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal, out var parsedFrom2))
                    {
                        fromDate = parsedFrom2;
                    }
                }
            }

            if (!string.IsNullOrEmpty(to))
            {
                // Try exact formats first with AssumeUniversal for UTC interpretation
                if (DateTime.TryParseExact(to, new[] { "yyyy-MM-dd'Z'", "yyyy-MM-ddTHH:mm:ss'Z'", "yyyy-MM-dd", "yyyy-MM-ddTHH:mm:ss" }, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal, out var parsedTo))
                {
                    toDate = parsedTo;
                }
                else
                {
                    // Fallback to general parse
                    if (DateTime.TryParse(to, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal, out var parsedTo2))
                    {
                        toDate = parsedTo2;
                    }
                }
            }

            // Default to today's UTC range when not provided
            if (fromDate == null && toDate == null)
            {
                (fromDate, toDate) = GetUtcDayRange(DateTime.UtcNow);
            }

            _logger.LogInformation("GetSummary parsed: customerId={CustomerId}, from={From}, to={To}", customerId, fromDate, toDate);

            var query = _context.InventoryMovements.AsNoTracking().Where(t => t.CustomerId == customerId);
            if (fromDate != null)
            {
                var fromDateUtc = fromDate.Value.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(fromDate.Value, DateTimeKind.Utc) : fromDate.Value;
                query = query.Where(t => t.OccurredAtUtc >= fromDateUtc);
            }
            if (toDate != null)
            {
                var toDateUtc = toDate.Value.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(toDate.Value, DateTimeKind.Utc) : toDate.Value;
                query = query.Where(t => t.OccurredAtUtc <= toDateUtc);
            }

            // Create a flat summary combining user and transaction type data
            var summary = await query
                .GroupBy(t => new { t.PerformedBy, t.TransactionType })
                .Select(g => new
                {
                    User = g.Key.PerformedBy ?? "Unknown",
                    TransactionType = g.Key.TransactionType ?? "Unknown",
                    Count = g.Count(),
                    TotalQuantity = Math.Abs(g.Sum(x => x.QuantityChange))
                })
                .OrderByDescending(x => x.Count)
                .ToListAsync();

            return Ok(new { summary });
        }

        // Convenience: summary for today (UTC)
        [HttpGet("customer/{customerId}/summary/today")]
        public Task<IActionResult> GetSummaryToday(int customerId)
        {
            var (from, to) = GetUtcDayRange(DateTime.UtcNow);
            return GetSummary(customerId, from.ToString("yyyy-MM-dd"), to.ToString("yyyy-MM-ddTHH:mm:ss"));
        }

        private static (DateTime from, DateTime to) GetUtcDayRange(DateTime utcNow)
        {
            var start = utcNow.Date; // 00:00:00 UTC
            var end = start.AddDays(1).AddTicks(-1); // end of day UTC
            return (start, end);
        }

        // Get aggregated picker performance data (counts by date/hour and picker)
        [HttpGet("customer/{customerId}/picker-performance")]
        public async Task<IActionResult> GetPickerPerformance(int customerId, [FromQuery] string? from = null, [FromQuery] string? to = null)
        {
            _logger.LogInformation("GetPickerPerformance raw params: from={From}, to={To}", from, to);

            // Parse dates from query string
            DateTime? fromDate = null;
            DateTime? toDate = null;

            if (!string.IsNullOrEmpty(from))
            {
                if (DateTime.TryParseExact(from, new[] { "yyyy-MM-dd'Z'", "yyyy-MM-ddTHH:mm:ss'Z'", "yyyy-MM-dd", "yyyy-MM-ddTHH:mm:ss" }, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal, out var parsedFrom))
                {
                    fromDate = parsedFrom;
                }
                else if (DateTime.TryParse(from, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal, out var parsedFrom2))
                {
                    fromDate = parsedFrom2;
                }
            }

            if (!string.IsNullOrEmpty(to))
            {
                if (DateTime.TryParseExact(to, new[] { "yyyy-MM-dd'Z'", "yyyy-MM-ddTHH:mm:ss'Z'", "yyyy-MM-dd", "yyyy-MM-ddTHH:mm:ss" }, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal, out var parsedTo))
                {
                    toDate = parsedTo;
                }
                else if (DateTime.TryParse(to, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal, out var parsedTo2))
                {
                    toDate = parsedTo2;
                }
            }

            // Default to last 7 days
            if (fromDate == null && toDate == null)
            {
                toDate = DateTime.UtcNow;
                fromDate = toDate.Value.AddDays(-7);
            }

            _logger.LogInformation("GetPickerPerformance parsed: from={From}, to={To}", fromDate, toDate);

            var query = _context.InventoryMovements.AsNoTracking().Where(t => t.CustomerId == customerId);
            
            if (fromDate != null)
            {
                var fromDateUtc = fromDate.Value.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(fromDate.Value, DateTimeKind.Utc) : fromDate.Value;
                query = query.Where(t => t.OccurredAtUtc >= fromDateUtc);
            }
            if (toDate != null)
            {
                var toDateUtc = toDate.Value.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(toDate.Value, DateTimeKind.Utc) : toDate.Value;
                query = query.Where(t => t.OccurredAtUtc <= toDateUtc);
            }

            // Determine if grouping by hour (same day) or date (multi-day)
            bool groupByHour = false;
            if (fromDate.HasValue && toDate.HasValue)
            {
                var daysDifference = (toDate.Value.Date - fromDate.Value.Date).TotalDays;
                groupByHour = daysDifference <= 1;
            }

            // Aggregate by hour (for same-day) or date (for multi-day) and picker
            dynamic performance;
            if (groupByHour)
            {
                // Group by hour and picker for same-day ranges
                performance = await query
                    .GroupBy(t => new { Hour = t.OccurredAtUtc.Hour, Picker = t.PerformedBy })
                    .Select(g => new
                    {
                        Hour = g.Key.Hour,
                        Picker = g.Key.Picker ?? "Unknown",
                        Count = g.Count(),
                        TransactionTypes = g.Select(t => t.TransactionType).Distinct().ToList()
                    })
                    .OrderBy(x => x.Hour)
                    .ThenBy(x => x.Picker)
                    .ToListAsync();
            }
            else
            {
                // Group by date and picker for multi-day ranges
                performance = await query
                    .GroupBy(t => new { Date = t.OccurredAtUtc.Date, Picker = t.PerformedBy })
                    .Select(g => new
                    {
                        Date = g.Key.Date,
                        Picker = g.Key.Picker ?? "Unknown",
                        Count = g.Count(),
                        TransactionTypes = g.Select(t => t.TransactionType).Distinct().ToList()
                    })
                    .OrderByDescending(x => x.Date)
                    .ThenBy(x => x.Picker)
                    .ToListAsync();
            }

            var performanceCount = ((System.Collections.ICollection)performance).Count;
            _logger.LogInformation("GetPickerPerformance: Returning {Count} picker-date combinations", performanceCount);

            return Ok(new { performance });
        }
    }
}

