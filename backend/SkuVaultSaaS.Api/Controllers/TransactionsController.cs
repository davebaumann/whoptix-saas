using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
using System.Security.Claims;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TransactionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<TransactionsController> _logger;

        public TransactionsController(ApplicationDbContext context, ILogger<TransactionsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // Helper method to check if current user can access the specified customer
        private async Task<bool> CanAccessCustomerAsync(int customerId)
        {
            // Admins can access any customer for management
            if (User.IsInRole("Admin"))
            {
                return true;
            }

            // Get current user's email
            var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? 
                           User.FindFirst(ClaimTypes.Name)?.Value;
            
            if (string.IsNullOrEmpty(userEmail))
            {
                return false;
            }

            // Check if user is associated with this customer
            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Id == customerId && c.Email == userEmail);
            
            return customer != null;
        }

        // List transactions for a customer within a date range (basic paging)
        [HttpGet("customer/{customerId}")]
        public async Task<IActionResult> GetTransactions(int customerId, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 100)
        {
            // Check tenant isolation
            if (!await CanAccessCustomerAsync(customerId))
            {
                return Forbid("Access denied to this customer's data");
            }
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 1000) pageSize = 100;

            // Default to today's UTC range when not provided
            if (from == null && to == null)
            {
                (from, to) = GetUtcDayRange(DateTime.UtcNow);
            }
            else if (from != null || to != null)
            {
                // Convert provided dates to UTC (assume they are date-only and should cover the full day in UTC)
                if (from != null)
                {
                    from = DateTime.SpecifyKind(from.Value.Date, DateTimeKind.Utc);
                }
                if (to != null)
                {
                    to = DateTime.SpecifyKind(to.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
                }
            }

            var query = _context.Transactions.AsNoTracking().Where(t => t.CustomerId == customerId);
            if (from != null) query = query.Where(t => t.TransactionDate >= from);
            if (to != null) query = query.Where(t => t.TransactionDate <= to);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(t => t.TransactionDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    t.Id,
                    t.Sku,
                    t.Quantity,
                    t.TransactionType,
                    t.TransactionReason,
                    t.PerformedBy,
                    t.TransactionNote,
                    t.Context,
                    TransactionDate = t.TransactionDate
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }

        // Convenience: list transactions for today (UTC)
        [HttpGet("customer/{customerId}/today")]
        public async Task<IActionResult> GetTransactionsToday(int customerId, [FromQuery] int page = 1, [FromQuery] int pageSize = 100)
        {
            // Check tenant isolation
            if (!await CanAccessCustomerAsync(customerId))
            {
                return Forbid("Access denied to this customer's data");
            }
            
            var (from, to) = GetUtcDayRange(DateTime.UtcNow);
            return await GetTransactions(customerId, from, to, page, pageSize);
        }

        // Summary by user/type within a date range for dashboard
        [HttpGet("customer/{customerId}/summary")]
        public async Task<IActionResult> GetSummary(int customerId, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null, [FromQuery] int? days = null)
        {
            // Check tenant isolation
            if (!await CanAccessCustomerAsync(customerId))
            {
                return Forbid("Access denied to this customer's data");
            }
            // If days parameter is provided, use the same logic as GetDailyCounts
            if (days.HasValue)
            {
                var endDate = DateTime.UtcNow.Date.AddDays(1); // Start of tomorrow
                var startDate = endDate.AddDays(-days.Value); // X days ago
                from = startDate;
                to = endDate;
            }
            // Default to today's UTC range when not provided
            else if (from == null && to == null)
            {
                (from, to) = GetUtcDayRange(DateTime.UtcNow);
            }
            else if (from != null || to != null)
            {
                // Convert provided dates to UTC (assume they are date-only and should cover the full day in UTC)
                if (from != null)
                {
                    from = DateTime.SpecifyKind(from.Value.Date, DateTimeKind.Utc);
                }
                if (to != null)
                {
                    to = DateTime.SpecifyKind(to.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
                }
            }

            // DEBUG: Log the actual values being used
            _logger.LogInformation("GetSummary: customerId={customerId}, from={from:yyyy-MM-dd HH:mm:ss}, to={to:yyyy-MM-dd HH:mm:ss}", customerId, from, to);

            // DEBUG: Check what data exists in database
            var allDataCount = await _context.Transactions.AsNoTracking()
                .Where(t => t.CustomerId == customerId)
                .CountAsync();
            _logger.LogInformation("GetSummary: Total records for customerId {customerId}: {count}", customerId, allDataCount);
            
            if (allDataCount > 0)
            {
                var dateRange = await _context.Transactions.AsNoTracking()
                    .Where(t => t.CustomerId == customerId)
                    .Select(t => t.TransactionDate)
                    .ToListAsync();
                var minDate = dateRange.Min();
                var maxDate = dateRange.Max();
                _logger.LogInformation("GetSummary: Date range in DB: {minDate:yyyy-MM-dd HH:mm:ss} to {maxDate:yyyy-MM-dd HH:mm:ss}", minDate, maxDate);
                
                // DEBUG: Check what falls within the query range
                var countInRange = await _context.Transactions.AsNoTracking()
                    .Where(t => t.CustomerId == customerId && 
                               (from == null || t.TransactionDate >= from) &&
                               (to == null || t.TransactionDate <= to))
                    .CountAsync();
                _logger.LogInformation("GetSummary: Records in query range: {countInRange}", countInRange);
            }

            var query = _context.Transactions.AsNoTracking().Where(t => t.CustomerId == customerId);
            if (from != null) query = query.Where(t => t.TransactionDate >= from);
            if (to != null) query = query.Where(t => t.TransactionDate <= to);

            var byUser = await query
                .GroupBy(t => t.PerformedBy)
                .Select(g => new
                {
                    User = g.Key,
                    Count = g.Count(),
                    NetQuantity = g.Sum(x => x.Quantity)
                })
                .OrderByDescending(x => x.Count)
                .ToListAsync();

            var byType = await query
                .GroupBy(t => t.TransactionType)
                .Select(g => new
                {
                    Type = g.Key,
                    Count = g.Count(),
                    NetQuantity = g.Sum(x => x.Quantity)
                })
                .OrderByDescending(x => x.Count)
                .ToListAsync();

            return Ok(new { byUser, byType });
        }

        // Convenience: summary for today (UTC)
        [HttpGet("customer/{customerId}/summary/today")]
        public async Task<IActionResult> GetSummaryToday(int customerId)
        {
            // Check tenant isolation
            if (!await CanAccessCustomerAsync(customerId))
            {
                return Forbid("Access denied to this customer's data");
            }
            
            var (from, to) = GetUtcDayRange(DateTime.UtcNow);
            return await GetSummary(customerId, from, to);
        }

        // Enhanced summary with hourly performance metrics
        [HttpGet("customer/{customerId}/performance")]
        public async Task<IActionResult> GetPerformanceMetrics(int customerId, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            // Check tenant isolation
            if (!await CanAccessCustomerAsync(customerId))
            {
                return Forbid("Access denied to this customer's data");
            }
            
            // Default to today's UTC range when not provided
            if (from == null && to == null)
            {
                (from, to) = GetUtcDayRange(DateTime.UtcNow);
            }
            else if (from != null || to != null)
            {
                // Convert provided dates to UTC (assume they are date-only and should cover the full day in UTC)
                if (from != null)
                {
                    from = DateTime.SpecifyKind(from.Value.Date, DateTimeKind.Utc);
                }
                if (to != null)
                {
                    to = DateTime.SpecifyKind(to.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
                }
            }

            var query = _context.Transactions.AsNoTracking()
                .Where(t => t.CustomerId == customerId && 
                           (t.TransactionType == "Pick" || t.TransactionType == "Pack"));
            
            if (from != null) query = query.Where(t => t.TransactionDate >= from);
            if (to != null) query = query.Where(t => t.TransactionDate <= to);

            var movements = await query.ToListAsync();

            if (!movements.Any())
            {
                return Ok(new { 
                    averageItemsPerHour = 0,
                    totalHours = 0,
                    totalItems = 0
                });
            }

            // Calculate time span and average items per hour
            var earliestTime = movements.Min(m => m.TransactionDate);
            var latestTime = movements.Max(m => m.TransactionDate);
            var totalHours = (latestTime - earliestTime).TotalHours;
            
            // If all movements are within the same hour, consider it as 1 hour minimum
            if (totalHours < 1) totalHours = 1;

            var totalItems = movements.Sum(m => Math.Abs(m.Quantity));
            var averageItemsPerHour = totalItems / totalHours;

            return Ok(new { 
                averageItemsPerHour = Math.Round(averageItemsPerHour, 2),
                totalHours = Math.Round(totalHours, 2),
                totalItems
            });
        }

        // Packer performance table
        [HttpGet("customer/{customerId}/packers")]
        public async Task<IActionResult> GetPackerPerformance(int customerId, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            // Check tenant isolation
            if (!await CanAccessCustomerAsync(customerId))
            {
                return Forbid("Access denied to this customer's data");
            }
            
            // Default to today's UTC range when not provided
            if (from == null && to == null)
            {
                (from, to) = GetUtcDayRange(DateTime.UtcNow);
            }
            else if (from != null || to != null)
            {
                // Convert provided dates to UTC (assume they are date-only and should cover the full day in UTC)
                if (from != null)
                {
                    from = DateTime.SpecifyKind(from.Value.Date, DateTimeKind.Utc);
                }
                if (to != null)
                {
                    to = DateTime.SpecifyKind(to.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
                }
            }

            var query = _context.Transactions.AsNoTracking()
                .Where(t => t.CustomerId == customerId && 
                           (t.TransactionType == "Pick" || t.TransactionType == "Pack"));
            
            if (from != null) query = query.Where(t => t.TransactionDate >= from);
            if (to != null) query = query.Where(t => t.TransactionDate <= to);

            var packerStats = await query
                .GroupBy(t => t.PerformedBy)
                .Select(g => new
                {
                    User = ExtractNameFromUser(g.Key ?? "Unknown"),
                    PickCount = g.Count(x => x.TransactionType == "Pick"),
                    PackCount = g.Count(x => x.TransactionType == "Pack"),
                    TotalQuantityPicked = g.Where(x => x.TransactionType == "Pick").Sum(x => Math.Abs(x.Quantity)),
                    TotalQuantityPacked = g.Where(x => x.TransactionType == "Pack").Sum(x => Math.Abs(x.Quantity)),
                    TotalQuantity = g.Sum(x => Math.Abs(x.Quantity)),
                    FirstActivity = g.Min(x => x.TransactionDate),
                    LastActivity = g.Max(x => x.TransactionDate)
                })
                .OrderByDescending(x => x.TotalQuantity)
                .ToListAsync();

            return Ok(new { packers = packerStats });
        }

        // Daily count chart data (last 30 days)
        [HttpGet("customer/{customerId}/daily-counts")]
        public async Task<IActionResult> GetDailyCounts(int customerId, [FromQuery] int days = 30)
        {
            // Check tenant isolation
            if (!await CanAccessCustomerAsync(customerId))
            {
                return Forbid("Access denied to this customer's data");
            }
            
            var endDate = DateTime.UtcNow.Date.AddDays(1); // Start of tomorrow
            var startDate = endDate.AddDays(-days); // X days ago

            var dailyData = await _context.Transactions.AsNoTracking()
                .Where(t => t.CustomerId == customerId && 
                           t.TransactionDate >= startDate && 
                           t.TransactionDate < endDate)
                .GroupBy(t => t.TransactionDate.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    TotalTransactions = g.Count(),
                    TotalQuantity = g.Sum(x => Math.Abs(x.Quantity)),
                    PickTransactions = g.Count(x => x.TransactionType == "Pick"),
                    PackTransactions = g.Count(x => x.TransactionType == "Pack"),
                    ReceiveTransactions = g.Count(x => x.TransactionType == "Receive"),
                    OtherTransactions = g.Count(x => x.TransactionType != "Pick" && x.TransactionType != "Pack" && x.TransactionType != "Receive")
                })
                .OrderBy(x => x.Date)
                .ToListAsync();

            // Fill in missing days with zero counts
            var result = new List<object>();
            for (var date = startDate.Date; date < endDate.Date; date = date.AddDays(1))
            {
                var dayData = dailyData.FirstOrDefault(d => d.Date == date);
                if (dayData != null)
                {
                    result.Add(dayData);
                }
                else
                {
                    result.Add(new
                    {
                        Date = date,
                        TotalTransactions = 0,
                        TotalQuantity = 0,
                        PickTransactions = 0,
                        PackTransactions = 0,
                        ReceiveTransactions = 0,
                        OtherTransactions = 0
                    });
                }
            }

            return Ok(new { dailyCounts = result });
        }

        // Helper method to extract name from user field (assumes format like "John Doe" or "john.doe@email.com")
        private static string ExtractNameFromUser(string user)
        {
            if (string.IsNullOrWhiteSpace(user))
                return "Unknown";

            // If it contains @ symbol, it's likely an email - extract name part
            if (user.Contains('@'))
            {
                var namePart = user.Split('@')[0];
                // Convert dots to spaces and title case
                return string.Join(" ", namePart.Split('.')
                    .Select(part => char.ToUpper(part[0]) + part.Substring(1).ToLower()));
            }

            // If it doesn't contain @, assume it's already a name
            return user;
        }

        // Simple dashboard data - all in one call
        [HttpGet("customer/{customerId}/dashboard")]
        public async Task<IActionResult> GetDashboardData(int customerId, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            // Check tenant isolation
            if (!await CanAccessCustomerAsync(customerId))
            {
                return Forbid("Access denied to this customer's data");
            }
            // Default to last 7 days if no dates provided
            if (from == null && to == null)
            {
                to = DateTime.UtcNow;
                from = to.Value.AddDays(-7);
            }
            else if (from != null || to != null)
            {
                if (from != null)
                {
                    from = DateTime.SpecifyKind(from.Value.Date, DateTimeKind.Utc);
                }
                if (to != null)
                {
                    to = DateTime.SpecifyKind(to.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
                }
            }

            var transactions = await _context.Transactions
                .Where(t => t.CustomerId == customerId && 
                           t.TransactionDate >= from && 
                           t.TransactionDate <= to)
                .OrderByDescending(t => t.TransactionDate)
                .ToListAsync();

            // KPIs
            var totalTransactions = transactions.Count;
            var totalQuantity = transactions.Sum(t => Math.Abs(t.Quantity));
            var activeUsers = transactions.Select(t => t.PerformedBy).Where(u => !string.IsNullOrEmpty(u)).Distinct().Count();
            var pickPackTransactions = transactions.Where(t => t.TransactionType == "Pick" || t.TransactionType == "Pack").ToList();
            
            // Calculate avg items per hour for pick/pack only
            double avgItemsPerHour = 0;
            if (pickPackTransactions.Any())
            {
                var earliestTime = pickPackTransactions.Min(t => t.TransactionDate);
                var latestTime = pickPackTransactions.Max(t => t.TransactionDate);
                var totalHours = (latestTime - earliestTime).TotalHours;
                if (totalHours < 1) totalHours = 1;
                var totalItems = pickPackTransactions.Sum(t => Math.Abs(t.Quantity));
                avgItemsPerHour = totalItems / totalHours;
            }

            // Activity summary by user and transaction type
            var activitySummary = transactions
                .GroupBy(t => new { User = ExtractNameFromUser(t.PerformedBy ?? "Unknown"), t.TransactionType })
                .Select(g => new
                {
                    User = g.Key.User,
                    TransactionType = g.Key.TransactionType ?? "Unknown",
                    Count = g.Count(),
                    TotalQuantity = g.Sum(t => Math.Abs(t.Quantity))
                })
                .OrderByDescending(x => x.Count)
                .ToList();

            // Recent transactions (last 20)
            var recentTransactions = transactions
                .Take(20)
                .Select(t => new
                {
                    t.Id,
                    t.Sku,
                    t.TransactionType,
                    t.Quantity,
                    t.TransactionDate,
                    PerformedBy = ExtractNameFromUser(t.PerformedBy ?? "Unknown"),
                    LocationId = t.LocationId
                })
                .ToList();

            return Ok(new
            {
                kpis = new
                {
                    totalTransactions,
                    totalQuantity,
                    activeUsers,
                    avgItemsPerHour = Math.Round(avgItemsPerHour, 1)
                },
                activitySummary,
                recentTransactions
            });
        }

        private static (DateTime from, DateTime to) GetUtcDayRange(DateTime utcNow)
        {
            var start = utcNow.Date; // 00:00:00 UTC
            var end = start.AddDays(1).AddTicks(-1); // end of day UTC
            return (start, end);
        }
    }
}
