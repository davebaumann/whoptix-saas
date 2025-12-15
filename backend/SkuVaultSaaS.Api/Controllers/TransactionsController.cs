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
        public async Task<IActionResult> GetTransactions(int customerId, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 100)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 1000) pageSize = 100;

            // Default to today's UTC range when not provided
            if (from == null && to == null)
            {
                (from, to) = GetUtcDayRange(DateTime.UtcNow);
            }

            var query = _context.InventoryMovements.AsNoTracking().Where(t => t.CustomerId == customerId);
            if (from != null) query = query.Where(t => t.OccurredAtUtc >= from);
            if (to != null) query = query.Where(t => t.OccurredAtUtc <= to);

            var total = await query.CountAsync();
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

            return Ok(new { transactions = items, totalCount = total, page, pageSize });
        }

        // Convenience: list transactions for today (UTC)
        [HttpGet("customer/{customerId}/today")]
        public Task<IActionResult> GetTransactionsToday(int customerId, [FromQuery] int page = 1, [FromQuery] int pageSize = 100)
        {
            var (from, to) = GetUtcDayRange(DateTime.UtcNow);
            return GetTransactions(customerId, from, to, page, pageSize);
        }

        // Summary by user/type within a date range for dashboard
        [HttpGet("customer/{customerId}/summary")]
        public async Task<IActionResult> GetSummary(int customerId, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            // Default to today's UTC range when not provided
            if (from == null && to == null)
            {
                (from, to) = GetUtcDayRange(DateTime.UtcNow);
            }

            var query = _context.InventoryMovements.AsNoTracking().Where(t => t.CustomerId == customerId);
            if (from != null) query = query.Where(t => t.OccurredAtUtc >= from);
            if (to != null) query = query.Where(t => t.OccurredAtUtc <= to);

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
            return GetSummary(customerId, from, to);
        }

        private static (DateTime from, DateTime to) GetUtcDayRange(DateTime utcNow)
        {
            var start = utcNow.Date; // 00:00:00 UTC
            var end = start.AddDays(1).AddTicks(-1); // end of day UTC
            return (start, end);
        }
    }
}

