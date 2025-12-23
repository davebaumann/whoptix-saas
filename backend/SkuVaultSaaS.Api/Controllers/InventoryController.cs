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
    public class InventoryController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<InventoryController> _logger;

        public InventoryController(ApplicationDbContext context, ILogger<InventoryController> logger)
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

        // Low Stock Report
        [HttpGet("customer/{customerId}/low-stock")]
        public async Task<IActionResult> GetLowStockReport(int customerId, [FromQuery] int threshold = 10, [FromQuery] int page = 1, [FromQuery] int pageSize = 100)
        {
            // Check tenant isolation
            if (!await CanAccessCustomerAsync(customerId))
            {
                return Forbid("Access denied to this customer's data");
            }
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 1000) pageSize = 100;
            if (threshold < 0) threshold = 10;

            var query = _context.InventoryLevels
                .Include(il => il.Product)
                .Include(il => il.Location)
                .Where(il => il.CustomerId == customerId && il.QuantityOnHand <= threshold)
                .OrderBy(il => il.QuantityOnHand)
                .ThenBy(il => il.Product.Sku);

            var totalCount = await query.CountAsync();

            var lowStockItems = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(il => new
                {
                    il.Id,
                    Sku = il.Product.Sku,
                    ProductName = il.Product.Name,
                    LocationCode = il.Location.Code,
                    LocationName = il.Location.Name,
                    il.QuantityOnHand,
                    il.QuantityAvailable,
                    il.QuantityAllocated,
                    il.UpdatedAtUtc,
                    StockLevel = il.QuantityOnHand <= 0 ? "Out of Stock" : 
                                il.QuantityOnHand <= 5 ? "Critical" : 
                                il.QuantityOnHand <= 10 ? "Low" : "Warning"
                })
                .ToListAsync();

            // Summary statistics
            var summary = await _context.InventoryLevels
                .Where(il => il.CustomerId == customerId && il.QuantityOnHand <= threshold)
                .GroupBy(il => 1)
                .Select(g => new
                {
                    TotalLowStockItems = g.Count(),
                    OutOfStockItems = g.Count(il => il.QuantityOnHand <= 0),
                    CriticalItems = g.Count(il => il.QuantityOnHand > 0 && il.QuantityOnHand <= 5),
                    LowItems = g.Count(il => il.QuantityOnHand > 5 && il.QuantityOnHand <= 10),
                    WarningItems = g.Count(il => il.QuantityOnHand > 10 && il.QuantityOnHand <= threshold),
                    TotalQuantityOnHand = g.Sum(il => il.QuantityOnHand),
                    AverageStockLevel = g.Average(il => (double)il.QuantityOnHand)
                })
                .FirstOrDefaultAsync();

            // Get out-of-stock items with revenue impact
            var cutoffDate = DateTime.UtcNow.AddDays(-30);
            var outOfStockItems = await _context.InventoryLevels
                .Include(il => il.Product)
                .Where(il => il.CustomerId == customerId && il.QuantityOnHand == 0)
                .Select(il => new
                {
                    il.Product.Sku,
                    il.Product.Name,
                    il.Product.Category,
                    il.Product.Price,
                    il.UpdatedAtUtc
                })
                .Distinct()
                .ToListAsync();

            // Calculate OOS metrics with sales velocity
            var oosData = new List<object>();
            foreach (var oos in outOfStockItems)
            {
                var last30DaySales = await _context.Sales
                    .Where(s => s.CustomerId == customerId && s.Sku == oos.Sku && s.SaleDate >= cutoffDate)
                    .ToListAsync();

                var velocity = last30DaySales.Any() ? (double)last30DaySales.Sum(s => s.Quantity) / 30 : 0;
                var daysOos = (int)(DateTime.UtcNow - oos.UpdatedAtUtc).TotalDays;
                var estimatedLostRevenue = velocity * daysOos * (double)(oos.Price ?? 0);
                var topChannel = last30DaySales
                    .GroupBy(s => s.Channel)
                    .OrderByDescending(g => g.Count())
                    .FirstOrDefault()?.Key ?? "Unknown";

                oosData.Add(new
                {
                    Sku = oos.Sku,
                    ProductName = oos.Name,
                    Category = oos.Category,
                    LastMovementDate = oos.UpdatedAtUtc,
                    DaysOutOfStock = daysOos,
                    Last30DayVelocity = Math.Round(velocity, 2),
                    LastKnownPrice = oos.Price ?? 0,
                    EstimatedLostRevenue = Math.Round((decimal)estimatedLostRevenue, 2),
                    TopChannel = topChannel
                });
            }

            var oosItems = oosData.OrderByDescending(x => ((dynamic)x).DaysOutOfStock).ToList();
            var oosSummary = new
            {
                TotalOutOfStockSkus = oosItems.Count,
                LongestOutOfStockDays = oosItems.Any() ? (int)oosItems.Max(x => ((dynamic)x).DaysOutOfStock) : 0,
                TotalEstimatedLostRevenue = oosItems.Cast<dynamic>().Sum(x => (decimal)x.EstimatedLostRevenue),
                AverageOutOfStockDays = oosItems.Any() ? oosItems.Average(x => ((dynamic)x).DaysOutOfStock) : 0,
                CriticalOosDays = oosItems.Count(x => ((dynamic)x).DaysOutOfStock > 30),
                UrgentOosDays = oosItems.Count(x => ((dynamic)x).DaysOutOfStock >= 14 && ((dynamic)x).DaysOutOfStock <= 30),
                RecentOosDays = oosItems.Count(x => ((dynamic)x).DaysOutOfStock < 14)
            };

            return Ok(new
            {
                summary = summary ?? new
                {
                    TotalLowStockItems = 0,
                    OutOfStockItems = 0,
                    CriticalItems = 0,
                    LowItems = 0,
                    WarningItems = 0,
                    TotalQuantityOnHand = 0,
                    AverageStockLevel = 0.0
                },
                items = lowStockItems,
                outOfStockSummary = oosSummary,
                outOfStockItems = oosItems,
                pagination = new
                {
                    currentPage = page,
                    pageSize,
                    totalCount,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                },
                threshold
            });
        }

        // Inventory Summary by Location
        [HttpGet("customer/{customerId}/summary")]
        public async Task<IActionResult> GetInventorySummary(int customerId)
        {
            // Check tenant isolation
            if (!await CanAccessCustomerAsync(customerId))
            {
                return Forbid("Access denied to this customer's data");
            }
            var locationSummary = await _context.InventoryLevels
                .Include(il => il.Location)
                .Where(il => il.CustomerId == customerId)
                .GroupBy(il => new { il.LocationId, il.Location.Code, il.Location.Name })
                .Select(g => new
                {
                    LocationId = g.Key.LocationId,
                    LocationCode = g.Key.Code,
                    LocationName = g.Key.Name,
                    TotalItems = g.Count(),
                    TotalQuantity = g.Sum(il => il.QuantityOnHand),
                    LowStockItems = g.Count(il => il.QuantityOnHand <= 10),
                    OutOfStockItems = g.Count(il => il.QuantityOnHand <= 0)
                })
                .OrderBy(x => x.LocationCode)
                .ToListAsync();

            var overallSummary = await _context.InventoryLevels
                .Where(il => il.CustomerId == customerId)
                .GroupBy(il => 1)
                .Select(g => new
                {
                    TotalLocations = g.Select(il => il.LocationId).Distinct().Count(),
                    TotalUniqueProducts = g.Select(il => il.ProductId).Distinct().Count(),
                    TotalInventoryItems = g.Count(),
                    TotalQuantityOnHand = g.Sum(il => il.QuantityOnHand),
                    TotalQuantityAvailable = g.Sum(il => il.QuantityAvailable),
                    TotalQuantityAllocated = g.Sum(il => il.QuantityAllocated)
                })
                .FirstOrDefaultAsync();

            return Ok(new
            {
                overallSummary = overallSummary ?? new
                {
                    TotalLocations = 0,
                    TotalUniqueProducts = 0,
                    TotalInventoryItems = 0,
                    TotalQuantityOnHand = 0,
                    TotalQuantityAvailable = 0,
                    TotalQuantityAllocated = 0
                },
                locationSummary
            });
        }
    }
}