using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
using System.Globalization;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/channel-performance")]
    public class ChannelPerformanceController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ChannelPerformanceController> _logger;

        public ChannelPerformanceController(ApplicationDbContext context, ILogger<ChannelPerformanceController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("customer/{customerId}/revenue")]
        public async Task<IActionResult> GetRevenueByChannel(int customerId, [FromQuery] string? from = null, [FromQuery] string? to = null)
        {
            _logger.LogInformation("GetRevenueByChannel: customerId={CustomerId}, from={From}, to={To}", customerId, from, to);

            // Parse dates from query string
            DateTime? fromDate = null;
            DateTime? toDate = null;

            if (!string.IsNullOrEmpty(from))
            {
                if (DateTime.TryParseExact(from, new[] { "yyyy-MM-dd'Z'", "yyyy-MM-ddTHH:mm:ss'Z'", "yyyy-MM-dd", "yyyy-MM-ddTHH:mm:ss" },
                    CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsedFrom))
                {
                    fromDate = parsedFrom;
                }
                else if (DateTime.TryParse(from, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsedFrom2))
                {
                    fromDate = parsedFrom2;
                }
            }

            if (!string.IsNullOrEmpty(to))
            {
                if (DateTime.TryParseExact(to, new[] { "yyyy-MM-dd'Z'", "yyyy-MM-ddTHH:mm:ss'Z'", "yyyy-MM-dd", "yyyy-MM-ddTHH:mm:ss" },
                    CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsedTo))
                {
                    toDate = parsedTo;
                }
                else if (DateTime.TryParse(to, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsedTo2))
                {
                    toDate = parsedTo2;
                }
            }

            // Default to last 30 days
            if (fromDate == null && toDate == null)
            {
                toDate = DateTime.UtcNow;
                fromDate = toDate.Value.AddDays(-30);
            }

            var query = _context.Sales.Where(s => s.CustomerId == customerId);

            if (fromDate.HasValue)
            {
                var fromDateUtc = fromDate.Value.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(fromDate.Value, DateTimeKind.Utc) : fromDate.Value;
                query = query.Where(s => s.SaleDate >= fromDateUtc);
            }

            if (toDate.HasValue)
            {
                var toDateUtc = toDate.Value.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(toDate.Value, DateTimeKind.Utc) : toDate.Value;
                query = query.Where(s => s.SaleDate <= toDateUtc);
            }

            var revenueByChannel = await query
                .GroupBy(s => s.Channel)
                .Select(g => new
                {
                    Channel = g.Key ?? "Unknown",
                    Revenue = g.Sum(s => (decimal)s.Quantity * s.Price),
                    Orders = g.Select(s => s.OrderNumber).Distinct().Count(),
                    Items = g.Sum(s => s.Quantity)
                })
                .OrderByDescending(x => x.Revenue)
                .ToListAsync();

            _logger.LogInformation("GetRevenueByChannel: Returning {Count} channels", revenueByChannel.Count);

            return Ok(new { revenue = revenueByChannel });
        }

        [HttpGet("customer/{customerId}/top-skus")]
        public async Task<IActionResult> GetTopSkusByChannel(int customerId, [FromQuery] string? from = null, [FromQuery] string? to = null, [FromQuery] int limit = 10)
        {
            _logger.LogInformation("GetTopSkusByChannel: customerId={CustomerId}, from={From}, to={To}, limit={Limit}", customerId, from, to, limit);

            // Parse dates from query string
            DateTime? fromDate = null;
            DateTime? toDate = null;

            if (!string.IsNullOrEmpty(from))
            {
                if (DateTime.TryParseExact(from, new[] { "yyyy-MM-dd'Z'", "yyyy-MM-ddTHH:mm:ss'Z'", "yyyy-MM-dd", "yyyy-MM-ddTHH:mm:ss" },
                    CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsedFrom))
                {
                    fromDate = parsedFrom;
                }
                else if (DateTime.TryParse(from, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsedFrom2))
                {
                    fromDate = parsedFrom2;
                }
            }

            if (!string.IsNullOrEmpty(to))
            {
                if (DateTime.TryParseExact(to, new[] { "yyyy-MM-dd'Z'", "yyyy-MM-ddTHH:mm:ss'Z'", "yyyy-MM-dd", "yyyy-MM-ddTHH:mm:ss" },
                    CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsedTo))
                {
                    toDate = parsedTo;
                }
                else if (DateTime.TryParse(to, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsedTo2))
                {
                    toDate = parsedTo2;
                }
            }

            // Default to last 30 days
            if (fromDate == null && toDate == null)
            {
                toDate = DateTime.UtcNow;
                fromDate = toDate.Value.AddDays(-30);
            }

            var query = _context.Sales.Where(s => s.CustomerId == customerId);

            if (fromDate.HasValue)
            {
                var fromDateUtc = fromDate.Value.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(fromDate.Value, DateTimeKind.Utc) : fromDate.Value;
                query = query.Where(s => s.SaleDate >= fromDateUtc);
            }

            if (toDate.HasValue)
            {
                var toDateUtc = toDate.Value.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(toDate.Value, DateTimeKind.Utc) : toDate.Value;
                query = query.Where(s => s.SaleDate <= toDateUtc);
            }

            // Get top SKUs by channel
            var topSkusQuery = await query
                .Where(s => !string.IsNullOrEmpty(s.Sku))  // Exclude null SKUs
                .GroupBy(s => s.Channel)
                .Select(channelGroup => new
                {
                    Channel = channelGroup.Key ?? "Unknown",
                    TopSkus = channelGroup
                        .GroupBy(s => s.Sku)
                        .Select(skuGroup => new
                        {
                            Sku = skuGroup.Key,
                            Quantity = skuGroup.Sum(s => s.Quantity),
                            Revenue = (decimal)skuGroup.Sum(s => (decimal)s.Quantity * s.Price),
                            Orders = skuGroup.Select(s => s.OrderNumber).Distinct().Count()
                        })
                        .ToList()
                })
                .ToListAsync();

            // Apply Take limit on client side
            var topSkus = topSkusQuery
                .Select(g => new
                {
                    g.Channel,
                    TopSkus = g.TopSkus
                        .OrderByDescending(x => x.Revenue)
                        .Take(limit)
                        .ToList()
                })
                .OrderByDescending(x => x.TopSkus.Sum(s => s.Revenue))
                .ToList();

            _logger.LogInformation("GetTopSkusByChannel: Returning {Count} channels", topSkus.Count);

            return Ok(new { topSkus });
        }

        [HttpGet("customer/{customerId}/trends")]
        public async Task<IActionResult> GetChannelTrends(int customerId, [FromQuery] string? from = null, [FromQuery] string? to = null)
        {
            _logger.LogInformation("GetChannelTrends: customerId={CustomerId}, from={From}, to={To}", customerId, from, to);

            // Parse dates from query string
            DateTime? fromDate = null;
            DateTime? toDate = null;

            if (!string.IsNullOrEmpty(from))
            {
                if (DateTime.TryParseExact(from, new[] { "yyyy-MM-dd'Z'", "yyyy-MM-ddTHH:mm:ss'Z'", "yyyy-MM-dd", "yyyy-MM-ddTHH:mm:ss" },
                    CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsedFrom))
                {
                    fromDate = parsedFrom;
                }
                else if (DateTime.TryParse(from, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsedFrom2))
                {
                    fromDate = parsedFrom2;
                }
            }

            if (!string.IsNullOrEmpty(to))
            {
                if (DateTime.TryParseExact(to, new[] { "yyyy-MM-dd'Z'", "yyyy-MM-ddTHH:mm:ss'Z'", "yyyy-MM-dd", "yyyy-MM-ddTHH:mm:ss" },
                    CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsedTo))
                {
                    toDate = parsedTo;
                }
                else if (DateTime.TryParse(to, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsedTo2))
                {
                    toDate = parsedTo2;
                }
            }

            // Default to last 30 days
            if (fromDate == null && toDate == null)
            {
                toDate = DateTime.UtcNow;
                fromDate = toDate.Value.AddDays(-30);
            }

            var query = _context.Sales.Where(s => s.CustomerId == customerId);

            if (fromDate.HasValue)
            {
                var fromDateUtc = fromDate.Value.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(fromDate.Value, DateTimeKind.Utc) : fromDate.Value;
                query = query.Where(s => s.SaleDate >= fromDateUtc);
            }

            if (toDate.HasValue)
            {
                var toDateUtc = toDate.Value.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(toDate.Value, DateTimeKind.Utc) : toDate.Value;
                query = query.Where(s => s.SaleDate <= toDateUtc);
            }

            // Get daily trends by channel
            var trends = await query
                .GroupBy(s => new { Date = s.SaleDate.Date, Channel = s.Channel })
                .Select(g => new
                {
                    Date = g.Key.Date,
                    Channel = g.Key.Channel ?? "Unknown",
                    Revenue = g.Sum(s => (decimal)s.Quantity * s.Price),
                    Orders = g.Select(s => s.OrderNumber).Distinct().Count(),
                    Items = g.Sum(s => s.Quantity)
                })
                .OrderBy(x => x.Date)
                .ThenBy(x => x.Channel)
                .ToListAsync();

            _logger.LogInformation("GetChannelTrends: Returning {Count} trend points", trends.Count);

            return Ok(new { trends });
        }
    }
}
