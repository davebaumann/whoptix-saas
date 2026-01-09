using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Infrastructure.Services;
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
        private readonly IDemoConnectionService _demoConnectionService;
        private readonly IConfiguration _configuration;

        public DemoReportsController(
            ApplicationDbContext context, 
            ILogger<DemoReportsController> logger,
            IDemoConnectionService demoConnectionService,
            IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _demoConnectionService = demoConnectionService;
            _configuration = configuration;
        }

        /// <summary>
        /// Get the demo database context
        /// </summary>
        private ApplicationDbContext GetDemoContext()
        {
            var connectionString = _demoConnectionService.GetConnectionString(null); // Demo users have no User principal
            var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
            optionsBuilder.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString));
            return new ApplicationDbContext(optionsBuilder.Options);
        }

        /// <summary>
        /// Get demo dashboard for customer 2 (demo customer)
        /// </summary>
        [HttpGet("customer/2/dashboard")]
        public async Task<IActionResult> GetDemoDashboard([FromQuery] string dateRange = "today")
        {
            _logger.LogInformation($"DemoReportsController.GetDemoDashboard: Called with dateRange={dateRange}");
            try
            {
                var demoContext = GetDemoContext();
                var customerId = 2; // Hard-coded demo customer

                var now = DateTime.UtcNow;
                var startDate = dateRange switch
                {
                    "yesterday" => now.AddDays(-1).Date,
                    "last7days" => now.AddDays(-7).Date,
                    _ => now.Date // "today"
                };
                var endDate = dateRange == "yesterday" 
                    ? now.AddDays(-1).Date.AddDays(1).AddTicks(-1) 
                    : now;

                var transactions = await demoContext.Transactions
                    .Where(t => t.CustomerId == customerId && t.TransactionDate >= startDate && t.TransactionDate <= endDate)
                    .Select(t => new { t.Id, t.Quantity })
                    .ToListAsync();

                var recentTransactions = await demoContext.Transactions
                    .Where(t => t.CustomerId == customerId && t.TransactionDate >= startDate && t.TransactionDate <= endDate)
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

                var movements = await demoContext.InventoryMovements
                    .Where(im => im.CustomerId == customerId && im.OccurredAtUtc >= startDate && im.OccurredAtUtc <= endDate)
                    .Select(im => new { im.QuantityChange, im.TransactionType, im.PerformedBy })
                    .ToListAsync();

                var kpis = new[]
                {
                    new
                    {
                        label = "Total Transactions",
                        value = transactions.Count > 0 ? transactions.Count : 127,
                        trend = "+5%"
                    },
                    new
                    {
                        label = "Total Quantity Moved",
                        value = movements.Count > 0 ? movements.Sum(m => Math.Abs(m.QuantityChange)) : 342,
                        trend = "+3%"
                    },
                    new
                    {
                        label = "Active Users",
                        value = movements.Count > 0 ? movements.Select(m => m.PerformedBy).Distinct().Count() : 8,
                        trend = "No change"
                    },
                    new
                    {
                        label = "Picks",
                        value = movements.Count > 0 ? movements.Count(m => m.TransactionType == "Pick") : 89,
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
                        byUser = movements
                            .GroupBy(m => m.PerformedBy)
                            .Select(userGroup => new
                            {
                                user = userGroup.Key,
                                transactionTypes = userGroup
                                    .GroupBy(m => m.TransactionType)
                                    .Select(typeGroup => new
                                    {
                                        type = typeGroup.Key,
                                        count = typeGroup.Count()
                                    })
                                    .ToList()
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
        public async Task<IActionResult> GetDemoInventory([FromQuery] string dateRange = "today")
        {
            try
            {
                var demoContext = GetDemoContext();
                var customerId = 2;

                // Only select needed columns to reduce memory usage
                var inventoryLevels = await demoContext.InventoryLevels
                    .Where(il => il.CustomerId == customerId && il.QuantityAvailable > 0)
                    .Select(il => new
                    {
                        il.ProductId,
                        il.LocationId,
                        il.QuantityAvailable,
                        ProductSku = il.Product.Sku,
                        ProductName = il.Product.Name,
                        ProductCost = il.Product.Cost,
                        ProductPrice = il.Product.Price,
                        LocationCode = il.Location.Code,
                        LocationName = il.Location.Name
                    })
                    .ToListAsync();

                var lowStockThresholds = await demoContext.LowStockThresholds
                    .Where(lst => lst.CustomerId == customerId && lst.IsActive)
                    .Select(lst => new { lst.ProductId, lst.LocationId, lst.ThresholdQuantity })
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

                    var costValue = (level.ProductCost ?? 0) * level.QuantityAvailable;
                    var retailValue = (level.ProductPrice ?? 0) * level.QuantityAvailable;

                    return new
                    {
                        sku = level.ProductSku,
                        productName = level.ProductName,
                        locationCode = level.LocationCode,
                        locationName = level.LocationName ?? level.LocationCode,
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
        public async Task<IActionResult> GetDemoLowStock([FromQuery] string dateRange = "today")
        {
            try
            {
                var demoContext = GetDemoContext();
                var customerId = 2;

                // Only select needed columns to reduce memory usage
                var inventoryLevels = await demoContext.InventoryLevels
                    .Where(il => il.CustomerId == customerId)
                    .Select(il => new
                    {
                        il.ProductId,
                        il.LocationId,
                        il.QuantityAvailable,
                        ProductSku = il.Product.Sku,
                        ProductName = il.Product.Name,
                        LocationCode = il.Location.Code,
                        LocationName = il.Location.Name
                    })
                    .ToListAsync();

                var lowStockThresholds = await demoContext.LowStockThresholds
                    .Where(lst => lst.CustomerId == customerId && lst.IsActive)
                    .Select(lst => new { lst.ProductId, lst.LocationId, lst.ThresholdQuantity })
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
                            sku = level.ProductSku,
                            productName = level.ProductName,
                            currentQty = level.QuantityAvailable,
                            threshold = thresholdQty,
                            variance,
                            location = level.LocationName ?? level.LocationCode,
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
                var demoContext = GetDemoContext();
                var customerId = 2;

                var inventoryLevels = await demoContext.InventoryLevels
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
        public async Task<IActionResult> GetDemoProfitability([FromQuery] string dateRange = "today")
        {
            try
            {
                var demoContext = GetDemoContext();
                var customerId = 2;
                var now = DateTime.UtcNow;
                
                // Calculate date filter based on dateRange parameter
                DateTime startDate = now.Date;
                DateTime endDate = now.Date.AddDays(1);
                
                switch (dateRange)
                {
                    case "yesterday":
                        startDate = now.AddDays(-1).Date;
                        endDate = now.Date;
                        break;
                    case "last7days":
                        startDate = now.AddDays(-7).Date;
                        endDate = now.Date.AddDays(1);
                        break;
                    case "today":
                    default:
                        startDate = now.Date;
                        endDate = now.Date.AddDays(1);
                        break;
                }

                _logger.LogInformation($"DemoProfitability: fetching for range {dateRange}, startDate={startDate}, endDate={endDate}");

                // First, let's see what transaction types exist for customer 2
                var allTransactions = await demoContext.Transactions
                    .Where(t => t.CustomerId == customerId && t.TransactionDate >= startDate && t.TransactionDate < endDate)
                    .ToListAsync();
                
                _logger.LogInformation($"DemoProfitability: found {allTransactions.Count} total transactions");
                var types = allTransactions.Select(t => t.TransactionType).Distinct().ToList();
                foreach (var type in types)
                {
                    _logger.LogInformation($"  - TransactionType: {type}");
                }

                // Get sales data with products
                var transactions = await demoContext.Transactions
                    .Where(t => t.CustomerId == customerId && t.TransactionType == "Sale" && t.TransactionDate >= startDate && t.TransactionDate < endDate)
                    .Join(demoContext.Products,
                        t => t.ProductId,
                        p => p.Id,
                        (t, p) => new { Transaction = t, Product = p })
                    .ToListAsync();

                _logger.LogInformation($"DemoProfitability: found {transactions.Count} sales transactions");

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

                // If no real sales data, return demo data
                if (items.Count == 0)
                {
                    _logger.LogInformation("DemoProfitability: no real data found, returning demo data");
                    var demoItems = new[]
                    {
                        new { sku = "SKU-001", productName = "Widget A", unitsSold = 150, revenue = 7500m, grossProfit = 3000m, marginPercent = 40.0 },
                        new { sku = "SKU-002", productName = "Widget B", unitsSold = 120, revenue = 6000m, grossProfit = 2400m, marginPercent = 40.0 },
                        new { sku = "SKU-003", productName = "Gadget X", unitsSold = 85, revenue = 8500m, grossProfit = 2125m, marginPercent = 25.0 },
                        new { sku = "SKU-004", productName = "Tool Pro", unitsSold = 45, revenue = 4500m, grossProfit = 1350m, marginPercent = 30.0 },
                        new { sku = "SKU-005", productName = "Basic Item", unitsSold = 200, revenue = 2000m, grossProfit = 200m, marginPercent = 10.0 }
                    };

                    var totalRevenue = demoItems.Sum(i => (decimal)i.revenue);
                    var totalGrossProfit = demoItems.Sum(i => (decimal)i.grossProfit);
                    var avgMargin = demoItems.Average(i => i.marginPercent);

                    return Ok(new
                    {
                        totalRevenue,
                        totalCost = totalGrossProfit,
                        totalGrossProfit,
                        totalUnitsSold = demoItems.Sum(i => i.unitsSold),
                        avgMarginPercent = avgMargin,
                        highMarginCount = demoItems.Count(i => i.marginPercent > 30),
                        mediumMarginCount = demoItems.Count(i => i.marginPercent >= 10 && i.marginPercent <= 30),
                        lowMarginCount = demoItems.Count(i => i.marginPercent >= 0 && i.marginPercent < 10),
                        unprofitableCount = demoItems.Count(i => i.marginPercent < 0),
                        items = demoItems
                    });
                }

                var totalRevenue2 = items.Sum(i => (decimal)i.revenue);
                var totalCost = items.Sum(i => (decimal)i.grossProfit);
                var totalGrossProfit2 = items.Sum(i => (decimal)i.grossProfit);
                var avgMargin2 = items.Count() > 0 ? items.Average(i => (double)i.marginPercent) : 0;

                return Ok(new
                {
                    totalRevenue = totalRevenue2,
                    totalCost,
                    totalGrossProfit = totalGrossProfit2,
                    totalUnitsSold = items.Sum(i => (int)i.unitsSold),
                    avgMarginPercent = avgMargin2,
                    highMarginCount = items.Count(i => (double)i.marginPercent > 30),
                    mediumMarginCount = items.Count(i => (double)i.marginPercent >= 10 && (double)i.marginPercent <= 30),
                    lowMarginCount = items.Count(i => (double)i.marginPercent >= 0 && (double)i.marginPercent < 10),
                    unprofitableCount = items.Count(i => (double)i.marginPercent < 0),
                    items
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demo profitability");
                return StatusCode(500, new { message = "Error fetching demo profitability" });
            }
        }

        /// <summary>
        /// Get top performers for demo customer 2
        /// </summary>
        [HttpGet("customer/2/top-performers")]
        public async Task<IActionResult> GetDemoTopPerformers([FromQuery] string dateRange = "today")
        {
            _logger.LogInformation("DemoReportsController.GetDemoTopPerformers: Called with dateRange={DateRange}", dateRange);
            try
            {
                var demoContext = GetDemoContext();
                var customerId = 2;
                var now = DateTime.UtcNow;
                
                var startDate = dateRange switch
                {
                    "yesterday" => now.AddDays(-1).Date,
                    "last7days" => now.AddDays(-7).Date,
                    _ => now.Date // "today"
                };
                var endDate = dateRange == "yesterday" 
                    ? now.AddDays(-1).Date.AddDays(1).AddTicks(-1) 
                    : now;

                // Filter in database query, not in memory
                var movements = await demoContext.InventoryMovements
                    .Where(im => im.CustomerId == customerId && im.OccurredAtUtc >= startDate && im.OccurredAtUtc <= endDate)
                    .Select(m => new { m.PerformedBy, m.TransactionType, m.OccurredAtUtc })
                    .ToListAsync();

                var topPerformers = movements
                    .GroupBy(m => m.PerformedBy)
                    .Select((g, idx) => new
                    {
                        rank = idx + 1,
                        name = g.Key,
                        picks = g.Count(m => m.TransactionType == "Pick"),
                        picksPerHour = g.Count(m => m.TransactionType == "Pick") / Math.Max(1, (now - g.Min(m => m.OccurredAtUtc)).TotalHours),
                        accuracy = 98 + (idx % 3), // Demo data
                        status = idx < 3 ? "On Track" : "Active"
                    })
                    .OrderByDescending(p => p.picks)
                    .Take(10)
                    .ToList();

                return Ok(new { topPerformers });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demo top performers");
                return StatusCode(500, new { message = "Error fetching demo top performers" });
            }
        }

        /// <summary>
        /// Get picker performance chart data for demo customer 2
        /// </summary>
        [HttpGet("customer/2/picker-performance")]
        public IActionResult GetDemoPickerPerformance()
        {
            _logger.LogInformation("DemoReportsController.GetDemoPickerPerformance: Called");
            try
            {

                // Generate demo picker performance data
                var pickerPerformance = new[]
                {
                    new { id = 1, name = "Sarah Johnson", shift = "Morning", unitsPicked = 1247, accuracy = 99, avgTimePerUnit = 12, status = "Active" },
                    new { id = 2, name = "Marcus Chen", shift = "Morning", unitsPicked = 1156, accuracy = 98, avgTimePerUnit = 13, status = "Active" },
                    new { id = 3, name = "Jessica Martinez", shift = "Afternoon", unitsPicked = 1089, accuracy = 97, avgTimePerUnit = 14, status = "Break" },
                    new { id = 4, name = "David Kim", shift = "Afternoon", unitsPicked = 1342, accuracy = 99, avgTimePerUnit = 11, status = "Active" },
                    new { id = 5, name = "Emma Wilson", shift = "Night", unitsPicked = 987, accuracy = 96, avgTimePerUnit = 15, status = "Active" }
                };

                var trends = new[]
                {
                    new { date = "Mon", accuracy = 97 },
                    new { date = "Tue", accuracy = 98 },
                    new { date = "Wed", accuracy = 97 },
                    new { date = "Thu", accuracy = 99 },
                    new { date = "Fri", accuracy = 98 },
                    new { date = "Sat", accuracy = 96 },
                    new { date = "Sun", accuracy = 97 }
                };

                var shiftPerformance = new[]
                {
                    new { name = "Morning (6am-2pm)", pickers = 12, avgAccuracy = 98.5, unitsProcessed = 2403 },
                    new { name = "Afternoon (2pm-10pm)", pickers = 10, avgAccuracy = 98.0, unitsProcessed = 2431 },
                    new { name = "Night (10pm-6am)", pickers = 5, avgAccuracy = 96.5, unitsProcessed = 987 }
                };

                var exceptions = new[]
                {
                    new { type = "Mispicks", count = 8 },
                    new { type = "Missing Items", count = 5 },
                    new { type = "Damaged Units", count = 3 },
                    new { type = "QC Rejects", count = 2 }
                };

                var kpis = new
                {
                    pickAccuracy = 97.8,
                    avgProcessingTime = 4.2,
                    pickRate = "156 units/hr",
                    onTimeShipRate = 94.5
                };

                return Ok(new
                {
                    kpis,
                    pickerPerformance,
                    trends,
                    shiftPerformance,
                    exceptions
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demo picker performance");
                return StatusCode(500, new { message = "Error fetching demo picker performance" });
            }
        }

        /// <summary>
        /// Get demand forecast for demo customer 2
        /// </summary>
        [HttpGet("customer/2/demand-forecast")]
        public IActionResult GetDemoDemandForecast([FromQuery] string forecastPeriod = "30days")
        {
            _logger.LogInformation($"DemoReportsController.GetDemoDemandForecast: Called with forecastPeriod={forecastPeriod}");
            try
            {

                // Generate demo forecast data
                var forecastItems = new[]
                {
                    new { sku = "KITT-GENE-3386", productName = "Generic Product - Green One Size", category = "Kitchen & Dining", avgDaily = 15.0, forecast = 450, trend = 0.0, currentStock = 104, daysLeft = 6.9, confidence = 95, risk = "Critical" },
                    new { sku = "SPO-BICY-8687", productName = "Bicycle Helmet - Standard", category = "Sports & Outdoors", avgDaily = 12.0, forecast = 360, trend = 0.0, currentStock = 7, daysLeft = 0.6, confidence = 95, risk = "Critical" },
                    new { sku = "HOM-PICT-4364", productName = "Picture Frame - Gray", category = "Home & Garden", avgDaily = 7.7, forecast = 345, trend = 50.0, currentStock = 45, daysLeft = 5.9, confidence = 93, risk = "Critical" },
                    new { sku = "AUT-FLOO-7837", productName = "Floor Mats - Standard", category = "Automotive", avgDaily = 9.0, forecast = 270, trend = 0.0, currentStock = 35, daysLeft = 3.9, confidence = 95, risk = "Critical" },
                    new { sku = "AUT-WIND-7622", productName = "Windshield Wipers - Red", category = "Automotive", avgDaily = 9.0, forecast = 270, trend = 0.0, currentStock = 50, daysLeft = 5.6, confidence = 95, risk = "Critical" },
                    new { sku = "AUT-WIND-2453", productName = "Windshield Wipers - White Large", category = "Automotive", avgDaily = 5.5, forecast = 247, trend = 50.0, currentStock = 21, daysLeft = 3.8, confidence = 95, risk = "Critical" },
                    new { sku = "ELE-BATT-5523", productName = "AA Battery Pack", category = "Electronics", avgDaily = 8.3, forecast = 223, trend = -10.0, currentStock = 156, daysLeft = 18.8, confidence = 92, risk = "Low" },
                    new { sku = "HOB-KNOB-3344", productName = "Door Knob Chrome", category = "Home Hardware", avgDaily = 4.2, forecast = 189, trend = 25.0, currentStock = 72, daysLeft = 17.1, confidence = 90, risk = "Low" }
                };

                var riskCounts = new
                {
                    critical = forecastItems.Count(i => i.risk == "Critical"),
                    high = forecastItems.Count(i => i.risk == "High"),
                    medium = forecastItems.Count(i => i.risk == "Medium"),
                    low = forecastItems.Count(i => i.risk == "Low")
                };

                // Calculate forecast metrics based on period
                var (periodDays, periodLabel, totalDemand) = forecastPeriod switch
                {
                    "7days" => (7, "7 days", 29400),
                    "14days" => (14, "14 days", 52000),
                    "60days" => (60, "60 days", 150000),
                    "90days" => (90, "90 days", 210000),
                    _ => (30, "30 days", 74448) // default 30days
                };

                var kpis = new
                {
                    skusAnalyzed = 601,
                    totalForecastedDemand = totalDemand,
                    forecastPeriod = periodLabel,
                    avgDailyDemand = (decimal)totalDemand / periodDays,
                    atRiskSkus = riskCounts.critical + riskCounts.high
                };

                return Ok(new
                {
                    kpis,
                    riskDistribution = new
                    {
                        critical = riskCounts.critical,
                        high = riskCounts.high,
                        medium = riskCounts.medium,
                        low = riskCounts.low
                    },
                    forecastItems
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demo demand forecast");
                return StatusCode(500, new { message = "Error fetching demo demand forecast" });
            }
        }

        /// <summary>
        /// Get financial report for demo customer 2
        /// </summary>
        [HttpGet("customer/2/financial")]
        public IActionResult GetDemoFinancial([FromQuery] string dateRange = "today")
        {
            _logger.LogInformation($"DemoReportsController.GetDemoFinancial: Called with dateRange={dateRange}");
            try
            {

                // Generate demo financial data with values varying by date range
                var (multiplier, period) = dateRange switch
                {
                    "yesterday" => (0.8, "Yesterday"),
                    "last7days" => (5.5, "Last 7 Days"),
                    _ => (1.0, "Today") // default "today"
                };

                var topProducts = new[]
                {
                    new { sku = "KITT-GENE-3386", productName = "Generic Product - Green One Size", unitsSold = (int)(145 * multiplier), revenue = 2175.00 * multiplier, cogs = 1305.00 * multiplier, profit = 870.00 * multiplier, marginPercent = 40.0 },
                    new { sku = "SPO-BICY-8687", productName = "Bicycle Helmet - Standard", unitsSold = (int)(98 * multiplier), revenue = 1960.00 * multiplier, cogs = 1078.00 * multiplier, profit = 882.00 * multiplier, marginPercent = 45.0 },
                    new { sku = "HOM-PICT-4364", productName = "Picture Frame - Gray", unitsSold = (int)(156 * multiplier), revenue = 1404.00 * multiplier, cogs = 701.00 * multiplier, profit = 703.00 * multiplier, marginPercent = 50.0 },
                    new { sku = "AUT-FLOO-7837", productName = "Floor Mats - Standard", unitsSold = (int)(234 * multiplier), revenue = 2106.00 * multiplier, cogs = 1263.00 * multiplier, profit = 843.00 * multiplier, marginPercent = 40.0 },
                    new { sku = "AUT-WIND-7622", productName = "Windshield Wipers - Red", unitsSold = (int)(178 * multiplier), revenue = 1960.00 * multiplier, cogs = 941.00 * multiplier, profit = 1019.00 * multiplier, marginPercent = 52.0 },
                    new { sku = "ELE-BATT-5523", productName = "AA Battery Pack", unitsSold = (int)(412 * multiplier), revenue = 1648.00 * multiplier, cogs = 742.00 * multiplier, profit = 906.00 * multiplier, marginPercent = 55.0 },
                    new { sku = "HOB-KNOB-3344", productName = "Door Knob Chrome", unitsSold = (int)(89 * multiplier), revenue = 1602.00 * multiplier, cogs = 480.00 * multiplier, profit = 1122.00 * multiplier, marginPercent = 70.0 },
                    new { sku = "AUT-WIND-2453", productName = "Windshield Wipers - White Large", unitsSold = (int)(67 * multiplier), revenue = 1340.00 * multiplier, cogs = 536.00 * multiplier, profit = 804.00 * multiplier, marginPercent = 60.0 }
                };

                var totalRevenue = topProducts.Sum(p => p.revenue);
                var totalCogs = topProducts.Sum(p => p.cogs);
                var grossProfit = totalRevenue - totalCogs;
                var totalUnits = topProducts.Sum(p => p.unitsSold);
                var totalOrders = (int)(127 * multiplier);

                var categoryPerformance = new[]
                {
                    new { category = "Kitchen & Dining", revenue = 2175.00 * multiplier },
                    new { category = "Sports & Outdoors", revenue = 1960.00 * multiplier },
                    new { category = "Home & Garden", revenue = 3245.00 * multiplier },
                    new { category = "Automotive", revenue = 5406.00 * multiplier },
                    new { category = "Electronics", revenue = 1648.00 * multiplier },
                    new { category = "Home Hardware", revenue = 1602.00 * multiplier }
                };

                var kpis = new
                {
                    totalRevenue = (int)totalRevenue,
                    grossProfit = (int)grossProfit,
                    totalOrders,
                    cogs = (int)totalCogs,
                    avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0,
                    totalUnits,
                    grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
                    cogsPercent = totalRevenue > 0 ? (totalCogs / totalRevenue) * 100 : 0
                };

                var metrics = new
                {
                    returnRate = 2.5,
                    customerLTV = 485.25 * multiplier,
                    inventoryTurnover = 3.4,
                    daysInventoryOutstanding = 107,
                    profitMargin = 22.5
                };

                return Ok(new
                {
                    kpis,
                    categoryPerformance,
                    metrics,
                    topProducts
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demo financial data");
                return StatusCode(500, new { message = "Error fetching demo financial data" });
            }
        }

        /// <summary>
        /// Get location analysis for demo customer 2
        /// </summary>
        [HttpGet("customer/2/locations")]
        public IActionResult GetDemoLocations()
        {
            _logger.LogInformation("DemoReportsController.GetDemoLocations: Called");
            try
            {

                // Generate demo location data
                var locations = new[]
                {
                    new { id = 1, name = "Main Warehouse - CA", skuCount = 1234, inventoryValue = 145000.00, totalUnits = 5420, utilization = 72, lowStockItems = 8, health = "Good" },
                    new { id = 2, name = "Regional Hub - TX", skuCount = 892, inventoryValue = 98500.00, totalUnits = 3847, utilization = 65, lowStockItems = 5, health = "Good" },
                    new { id = 3, name = "Distribution Center - NY", skuCount = 1067, inventoryValue = 112300.00, totalUnits = 4512, utilization = 81, lowStockItems = 14, health = "Warning" },
                    new { id = 4, name = "Fulfillment Center - IL", skuCount = 756, inventoryValue = 67200.00, totalUnits = 2834, utilization = 58, lowStockItems = 3, health = "Good" }
                };

                var topSkus = new[]
                {
                    new { 
                        sku = "KITT-GENE-3386", 
                        productName = "Generic Product - Green One Size", 
                        totalUnits = 1245,
                        distribution = new[] {
                            new { location = "Main Warehouse - CA", percentage = 35 },
                            new { location = "Regional Hub - TX", percentage = 28 },
                            new { location = "Distribution Center - NY", percentage = 22 },
                            new { location = "Fulfillment Center - IL", percentage = 15 }
                        }
                    },
                    new { 
                        sku = "SPO-BICY-8687", 
                        productName = "Bicycle Helmet - Standard", 
                        totalUnits = 956,
                        distribution = new[] {
                            new { location = "Main Warehouse - CA", percentage = 40 },
                            new { location = "Regional Hub - TX", percentage = 32 },
                            new { location = "Distribution Center - NY", percentage = 18 },
                            new { location = "Fulfillment Center - IL", percentage = 10 }
                        }
                    },
                    new { 
                        sku = "AUT-FLOO-7837", 
                        productName = "Floor Mats - Standard", 
                        totalUnits = 1872,
                        distribution = new[] {
                            new { location = "Main Warehouse - CA", percentage = 28 },
                            new { location = "Regional Hub - TX", percentage = 24 },
                            new { location = "Distribution Center - NY", percentage = 32 },
                            new { location = "Fulfillment Center - IL", percentage = 16 }
                        }
                    },
                    new { 
                        sku = "HOB-KNOB-3344", 
                        productName = "Door Knob Chrome", 
                        totalUnits = 734,
                        distribution = new[] {
                            new { location = "Main Warehouse - CA", percentage = 38 },
                            new { location = "Regional Hub - TX", percentage = 26 },
                            new { location = "Distribution Center - NY", percentage = 20 },
                            new { location = "Fulfillment Center - IL", percentage = 16 }
                        }
                    }
                };

                var kpis = new
                {
                    totalLocations = locations.Length,
                    totalInventoryValue = locations.Sum(l => l.inventoryValue),
                    avgUtilization = locations.Average(l => l.utilization),
                    totalSkus = locations.Sum(l => l.skuCount)
                };

                return Ok(new
                {
                    kpis,
                    locations,
                    topSkus
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demo location data");
                return StatusCode(500, new { message = "Error fetching demo location data" });
            }
        }

        /// <summary>
        /// Get performance metrics for demo customer 2
        /// </summary>
        [HttpGet("customer/2/performance-metrics")]
        public IActionResult GetDemoPerformanceMetrics()
        {
            _logger.LogInformation("DemoReportsController.GetDemoPerformanceMetrics: Called");
            try
            {

                // Top performing SKUs
                var topPerformers = new[]
                {
                    new { sku = "SPO-BICY-8687", productName = "Bicycle Helmet - Standard", velocity = 45.5, turnoverRate = 12.3, currentStock = 234, category = "Sports & Outdoors" },
                    new { sku = "AUT-WIND-7622", productName = "Windshield Wipers - Red", velocity = 38.2, turnoverRate = 10.8, currentStock = 456, category = "Automotive" },
                    new { sku = "ELE-BATT-5523", productName = "AA Battery Pack", velocity = 67.3, turnoverRate = 15.2, currentStock = 789, category = "Electronics" },
                    new { sku = "KITT-GENE-3386", productName = "Generic Product - Green One Size", velocity = 52.1, turnoverRate = 11.5, currentStock = 123, category = "Kitchen & Dining" },
                    new { sku = "HOB-KNOB-3344", productName = "Door Knob Chrome", velocity = 31.8, turnoverRate = 8.9, currentStock = 567, category = "Home Hardware" }
                };

                // Under performing SKUs
                var underPerformers = new[]
                {
                    new { sku = "HOM-DECOR-2891", productName = "Decorative Mirror - Gold", velocity = 0.3, daysOfStock = 267, currentStock = 89, category = "Home & Garden" },
                    new { sku = "ART-PAINT-1234", productName = "Professional Paint Set", velocity = 0.8, daysOfStock = 145, currentStock = 34, category = "Art Supplies" },
                    new { sku = "TOOL-WRENCH-5678", productName = "Adjustable Wrench Set", velocity = 1.2, daysOfStock = 98, currentStock = 56, category = "Tools" },
                    new { sku = "LIGHT-LED-9999", productName = "LED Strip Lights", velocity = 0.5, daysOfStock = 203, currentStock = 42, category = "Electronics" }
                };

                // Trends
                var trends = new[]
                {
                    new { metric = "Sales Growth", change = 12.5, direction = "up" },
                    new { metric = "Units Sold", change = 8.3, direction = "up" },
                    new { metric = "Movement Growth", change = 5.7, direction = "up" },
                    new { metric = "Active Products", change = 2.1, direction = "stable" }
                };

                var velocityMetrics = new
                {
                    fastMovingCount = 68,
                    mediumMovingCount = 145,
                    slowMovingCount = 234,
                    deadStockCount = 54
                };

                var summary = new
                {
                    totalProducts = 501,
                    totalMovements = 3847,
                    averageVelocity = 8.5,
                    averageTurnover = 4.2,
                    fastMovers = velocityMetrics.fastMovingCount,
                    slowMovers = velocityMetrics.slowMovingCount,
                    unitsSold = 18234,
                    unitsSoldGrowth = 8.3,
                    averageStockCoverage = 45.2,
                    activeSKUs = 447,
                    zeroStockSKUs = 12,
                    totalTransactions = 3847
                };

                return Ok(new
                {
                    summary,
                    velocityMetrics,
                    trends,
                    topPerformers,
                    underPerformers
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demo performance metrics");
                return StatusCode(500, new { message = "Error fetching demo performance metrics" });
            }
        }
    }
}
