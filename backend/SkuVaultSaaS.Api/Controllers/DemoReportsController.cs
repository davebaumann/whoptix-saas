using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkuVaultSaaS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace SkuVaultSaaS.Api.Controllers
{
    /// <summary>
    /// Demo-only reports controller for unauthenticated demo access.
    /// These endpoints provide read-only access to customer 2's data for demonstration purposes.
    /// All endpoints are completely anonymous and do not require authentication.
    /// </summary>
    [ApiController]
    [Route("api/demo/reports")]
    [AllowAnonymous]
    public class DemoReportsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<DemoReportsController> _logger;

        public DemoReportsController(ApplicationDbContext context, ILogger<DemoReportsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Get demo dashboard for customer 2 (demo customer)
        /// </summary>
        [HttpGet("customer/2/dashboard")]
        public async Task<IActionResult> GetDemoDashboard()
        {
            _logger.LogInformation("DemoReportsController.GetDemoDashboard: Called");
            try
            {
                var customerId = 2; // Hard-coded demo customer

                var now = DateTime.UtcNow;
                var last30Days = now.AddDays(-30);
                var last7Days = now.AddDays(-7);

                var transactions = await _context.Transactions
                    .Where(t => t.CustomerId == customerId && t.TransactionDate >= last30Days)
                    .ToListAsync();

                var recentTransactions = await _context.Transactions
                    .Where(t => t.CustomerId == customerId && t.TransactionDate >= last7Days)
                    .OrderByDescending(t => t.TransactionDate)
                    .Take(10)
                    .Select(t => new
                    {
                        t.Id,
                        t.Sku,
                        t.TransactionType,
                        t.Quantity,
                        t.TransactionDate,
                        t.PerformedBy
                    })
                    .ToListAsync();

                var movements = await _context.InventoryMovements
                    .Where(im => im.CustomerId == customerId && im.OccurredAtUtc >= last30Days)
                    .ToListAsync();

                var kpis = new[]
                {
                    new
                    {
                        label = "Total Transactions",
                        value = transactions.Count,
                        trend = "+5%"
                    },
                    new
                    {
                        label = "Total Quantity Moved",
                        value = movements.Sum(m => Math.Abs(m.QuantityChange)),
                        trend = "+3%"
                    },
                    new
                    {
                        label = "Active Users",
                        value = movements.Select(m => m.PerformedBy).Distinct().Count(),
                        trend = "No change"
                    },
                    new
                    {
                        label = "Picks",
                        value = movements.Count(m => m.TransactionType == "Pick"),
                        trend = "+2%"
                    }
                };

                return Ok(new
                {
                    kpis,
                    activitySummary = new
                    {
                        totalTransactions = transactions.Count,
                        totalQuantity = movements.Sum(m => Math.Abs(m.QuantityChange)),
                        byType = movements
                            .GroupBy(m => m.TransactionType)
                            .Select(g => new
                            {
                                type = g.Key,
                                count = g.Count()
                            })
                            .ToList()
                    },
                    recentTransactions
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demo dashboard");
                return StatusCode(500, new { message = "Error fetching demo dashboard" });
            }
        }

        /// <summary>
        /// Get inventory report for demo customer 2
        /// </summary>
        [HttpGet("customer/2/inventory")]
        public async Task<IActionResult> GetDemoInventory()
        {
            try
            {
                var customerId = 2;

                var inventoryLevels = await _context.InventoryLevels
                    .Where(il => il.CustomerId == customerId && il.QuantityAvailable > 0)
                    .Include(il => il.Product)
                    .Include(il => il.Location)
                    .ToListAsync();

                var lowStockThresholds = await _context.LowStockThresholds
                    .Where(lst => lst.CustomerId == customerId && lst.IsActive)
                    .ToListAsync();

                var items = inventoryLevels.Select(level =>
                {
                    var specificThreshold = lowStockThresholds
                        .FirstOrDefault(t => t.ProductId == level.ProductId && t.LocationId == level.LocationId);
                    var generalThreshold = lowStockThresholds
                        .FirstOrDefault(t => t.ProductId == level.ProductId && t.LocationId == null);
                    var threshold = specificThreshold ?? generalThreshold;
                    var thresholdQty = threshold?.ThresholdQuantity ?? 10;
                    var isLowStock = level.QuantityAvailable <= thresholdQty;

                    var costValue = (level.Product.Cost ?? 0) * level.QuantityAvailable;
                    var retailValue = (level.Product.Price ?? 0) * level.QuantityAvailable;

                    return new
                    {
                        sku = level.Product.Sku,
                        productName = level.Product.Name,
                        locationCode = level.Location.Code,
                        locationName = level.Location.Name ?? level.Location.Code,
                        warehouse = "Main",
                        quantity = level.QuantityAvailable,
                        totalCostValue = costValue,
                        totalRetailValue = retailValue,
                        isLowStock,
                        thresholdQuantity = thresholdQty
                    };
                }).ToList();

                return Ok(new
                {
                    totalSkus = items.Count,
                    totalQuantity = items.Sum(i => (int)i.quantity),
                    totalCostValue = items.Sum(i => (decimal)i.totalCostValue),
                    totalRetailValue = items.Sum(i => (decimal)i.totalRetailValue),
                    lowStockCount = items.Count(i => (bool)i.isLowStock),
                    outOfStockCount = 0,
                    items
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demo inventory");
                return StatusCode(500, new { message = "Error fetching demo inventory" });
            }
        }

        /// <summary>
        /// Get low stock report for demo customer 2
        /// </summary>
        [HttpGet("customer/2/low-stock")]
        public async Task<IActionResult> GetDemoLowStock()
        {
            try
            {
                var customerId = 2;

                var inventoryLevels = await _context.InventoryLevels
                    .Where(il => il.CustomerId == customerId)
                    .Include(il => il.Product)
                    .Include(il => il.Location)
                    .ToListAsync();

                var lowStockThresholds = await _context.LowStockThresholds
                    .Where(lst => lst.CustomerId == customerId && lst.IsActive)
                    .ToListAsync();

                var lowStockItems = inventoryLevels
                    .Where(level =>
                    {
                        var specificThreshold = lowStockThresholds
                            .FirstOrDefault(t => t.ProductId == level.ProductId && t.LocationId == level.LocationId);
                        var generalThreshold = lowStockThresholds
                            .FirstOrDefault(t => t.ProductId == level.ProductId && t.LocationId == null);
                        var threshold = specificThreshold ?? generalThreshold;
                        var thresholdQty = threshold?.ThresholdQuantity ?? 10;
                        return level.QuantityAvailable <= thresholdQty;
                    })
                    .Select(level =>
                    {
                        var specificThreshold = lowStockThresholds
                            .FirstOrDefault(t => t.ProductId == level.ProductId && t.LocationId == level.LocationId);
                        var generalThreshold = lowStockThresholds
                            .FirstOrDefault(t => t.ProductId == level.ProductId && t.LocationId == null);
                        var threshold = specificThreshold ?? generalThreshold;
                        var thresholdQty = threshold?.ThresholdQuantity ?? 10;
                        var variance = level.QuantityAvailable - thresholdQty;
                        
                        // Simple heuristic for days of supply
                        int daysOfSupply = level.QuantityAvailable > 0 ? Math.Max(1, level.QuantityAvailable / 2) : 0;

                        string status = level.QuantityAvailable <= (thresholdQty * 0.25) ? "critical" :
                                       level.QuantityAvailable <= (thresholdQty * 0.5) ? "urgent" : "warning";

                        return new
                        {
                            sku = level.Product.Sku,
                            productName = level.Product.Name,
                            currentQty = level.QuantityAvailable,
                            threshold = thresholdQty,
                            variance,
                            location = level.Location.Name ?? level.Location.Code,
                            status,
                            daysOfSupply
                        };
                    })
                    .OrderByDescending(item => item.status == "critical" ? 3 : item.status == "urgent" ? 2 : 1)
                    .ToList();

                return Ok(new
                {
                    totalLowStockItems = lowStockItems.Count,
                    criticalItems = lowStockItems.Count(i => i.status == "critical"),
                    urgentItems = lowStockItems.Count(i => i.status == "urgent"),
                    warningItems = lowStockItems.Count(i => i.status == "warning"),
                    items = lowStockItems
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demo low stock");
                return StatusCode(500, new { message = "Error fetching demo low stock" });
            }
        }

        /// <summary>
        /// Get aging inventory report for demo customer 2
        /// </summary>
        [HttpGet("customer/2/aging-inventory")]
        public async Task<IActionResult> GetDemoAgingInventory()
        {
            try
            {
                var customerId = 2;

                var inventoryLevels = await _context.InventoryLevels
                    .Where(il => il.CustomerId == customerId)
                    .Include(il => il.Product)
                    .Include(il => il.Location)
                    .ToListAsync();

                var items = inventoryLevels
                    .Where(level => level.QuantityAvailable > 0)
                    .Select(level =>
                    {
                        // Simulate aging based on inventory levels
                        int daysInInventory = (int)level.QuantityAvailable * 5; // Mock aging calculation
                        
                        return new
                        {
                            sku = level.Product.Sku,
                            productName = level.Product.Name,
                            daysInInventory,
                            quantity = level.QuantityAvailable,
                            costValue = (level.Product.Cost ?? 0) * level.QuantityAvailable,
                            location = level.Location.Name ?? level.Location.Code,
                            ageGroup = daysInInventory > 180 ? "Over 180 days" :
                                      daysInInventory > 90 ? "Over 90 days" :
                                      daysInInventory > 60 ? "60-90 days" :
                                      daysInInventory > 30 ? "30-60 days" : "0-30 days"
                        };
                    })
                    .OrderByDescending(i => i.daysInInventory)
                    .ToList();

                return Ok(new
                {
                    totalItems = items.Count,
                    totalValue = items.Sum(i => (decimal)i.costValue),
                    averageAge = items.Count > 0 ? (int)items.Average(i => i.daysInInventory) : 0,
                    oldestItem = items.Count > 0 ? items.Max(i => i.daysInInventory) : 0,
                    itemsOver30Days = items.Count(i => i.daysInInventory > 30),
                    itemsOver60Days = items.Count(i => i.daysInInventory > 60),
                    itemsOver90Days = items.Count(i => i.daysInInventory > 90),
                    itemsOver180Days = items.Count(i => i.daysInInventory > 180),
                    items
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demo aging inventory");
                return StatusCode(500, new { message = "Error fetching demo aging inventory" });
            }
        }

        /// <summary>
        /// Get profitability report for demo customer 2
        /// </summary>
        [HttpGet("customer/2/profitability")]
        public async Task<IActionResult> GetDemoProfitability()
        {
            try
            {
                var customerId = 2;

                // Get sales data with products
                var transactions = await _context.Transactions
                    .Where(t => t.CustomerId == customerId && t.TransactionType == "Sale")
                    .Join(_context.Products,
                        t => t.ProductId,
                        p => p.Id,
                        (t, p) => new { Transaction = t, Product = p })
                    .ToListAsync();

                var items = transactions
                    .GroupBy(t => t.Product)
                    .Select(g =>
                    {
                        var cost = g.Key.Cost ?? 0;
                        var price = g.Key.Price ?? 0;
                        var unitsSold = g.Count();
                        var revenue = price * unitsSold;
                        var grossProfit = (price - cost) * unitsSold;
                        var marginPercent = price > 0 ? ((price - cost) / price) * 100 : 0;

                        return new
                        {
                            sku = g.Key.Sku,
                            productName = g.Key.Name,
                            unitsSold,
                            revenue,
                            grossProfit,
                            marginPercent
                        };
                    })
                    .OrderByDescending(i => i.grossProfit)
                    .ToList();

                var totalRevenue = items.Sum(i => (decimal)i.revenue);
                var totalCost = items.Sum(i => (decimal)i.grossProfit);
                var totalGrossProfit = items.Sum(i => (decimal)i.grossProfit);
                var avgMargin = items.Count() > 0 ? items.Average(i => i.marginPercent) : 0;

                return Ok(new
                {
                    totalRevenue,
                    totalCost,
                    totalGrossProfit,
                    totalUnitsSold = items.Sum(i => i.unitsSold),
                    avgMarginPercent = avgMargin,
                    highMarginCount = items.Count(i => i.marginPercent > 30),
                    mediumMarginCount = items.Count(i => i.marginPercent >= 10 && i.marginPercent <= 30),
                    lowMarginCount = items.Count(i => i.marginPercent >= 0 && i.marginPercent < 10),
                    unprofitableCount = items.Count(i => i.marginPercent < 0),
                    items
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demo profitability");
                return StatusCode(500, new { message = "Error fetching demo profitability" });
            }
        }
    }
}
