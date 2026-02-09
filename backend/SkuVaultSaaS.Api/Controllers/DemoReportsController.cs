using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

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
            var connectionString = _demoConnectionService.GetConnectionString(null!); // Demo users have no ClaimsPrincipal
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
                    .ToListAsync();

                var recentTransactions = transactions
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
                    .ToList();

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
                        value = transactions.Sum(t => t.Quantity),
                        trend = "+3%"
                    },
                    new
                    {
                        label = "Active Users",
                        value = transactions.Select(t => t.PerformedBy).Distinct().Count(),
                        trend = "No change"
                    },
                    new
                    {
                        label = "Picks",
                        value = transactions.Count(t => t.TransactionType == "Pick"),
                        trend = "+2%"
                    }
                };

                return Ok(new
                {
                    kpis,
                    activitySummary = new
                    {
                        totalTransactions = transactions.Count,
                        totalQuantity = transactions.Sum(t => t.Quantity),
                        byUser = transactions
                            .GroupBy(t => t.PerformedBy)
                            .Select(userGroup => new
                            {
                                user = userGroup.Key,
                                transactionTypes = userGroup
                                    .GroupBy(t => t.TransactionType)
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
        public async Task<IActionResult> GetDemoProfitability([FromQuery] string dateRange = "last90days")
        {
            try
            {
                var demoContext = GetDemoContext();
                var customerId = 2;
                var now = DateTime.UtcNow;
                
                // Calculate date filter based on dateRange parameter - default to last 90 days to match historical sales data
                DateTime startDate = now.AddDays(-90).Date;
                DateTime endDate = now.Date.AddDays(1);
                
                switch (dateRange)
                {
                    case "today":
                        startDate = now.Date;
                        endDate = now.Date.AddDays(1);
                        break;
                    case "yesterday":
                        startDate = now.AddDays(-1).Date;
                        endDate = now.Date;
                        break;
                    case "last7days":
                        startDate = now.AddDays(-7).Date;
                        endDate = now.Date.AddDays(1);
                        break;
                    case "last90days":
                    default:
                        startDate = now.AddDays(-90).Date;
                        endDate = now.Date.AddDays(1);
                        break;
                }

                _logger.LogInformation($"DemoProfitability: fetching for range {dateRange}, startDate={startDate}, endDate={endDate}");

                // Get sales data from Sales table and join with products to get cost data
                var sales = await demoContext.Sales
                    .Where(s => s.CustomerId == customerId && s.SaleDate >= startDate && s.SaleDate < endDate)
                    .Join(demoContext.Products,
                        s => s.Sku,
                        p => p.Sku,
                        (s, p) => new { Sale = s, Product = p })
                    .ToListAsync();

                _logger.LogInformation($"DemoProfitability: found {sales.Count} sales transactions");

                var items = sales
                    .GroupBy(x => x.Product)
                    .Select(g =>
                    {
                        var cost = g.Key.Cost ?? 0;
                        var price = g.Key.Price ?? 0;
                        var unitsSold = g.Sum(x => x.Sale.Quantity);
                        var revenue = (decimal)price * unitsSold;
                        var grossProfit = ((decimal)price - cost) * unitsSold;
                        var marginPercent = price > 0 ? (((decimal)price - cost) / (decimal)price) * 100 : 0;

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
                var totalCostOfGoodsSold = sales.Sum(x => (decimal)(x.Product.Cost ?? 0) * x.Sale.Quantity);
                var totalGrossProfit = totalRevenue - totalCostOfGoodsSold;
                var avgMargin = items.Count() > 0 ? items.Average(i => (double)i.marginPercent) : 0;

                return Ok(new
                {
                    totalRevenue,
                    totalCost = totalCostOfGoodsSold,
                    totalGrossProfit,
                    totalUnitsSold = items.Sum(i => (int)i.unitsSold),
                    avgMarginPercent = avgMargin,
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

                // Filter transactions by date range
                var transactions = await demoContext.Transactions
                    .Where(t => t.CustomerId == customerId && t.TransactionDate >= startDate && t.TransactionDate <= endDate)
                    .Select(t => new { t.PerformedBy, t.TransactionType, t.TransactionDate })
                    .ToListAsync();

                var topPerformers = transactions
                    .GroupBy(t => t.PerformedBy)
                    .Select((g, idx) => new
                    {
                        rank = idx + 1,
                        name = g.Key,
                        picks = g.Count(t => t.TransactionType == "Pick"),
                        picksPerHour = g.Count(t => t.TransactionType == "Pick") / Math.Max(1, (now - g.Min(t => t.TransactionDate)).TotalHours),
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
        public async Task<IActionResult> GetDemoPickerPerformance([FromQuery] string dateRange = "today")
        {
            _logger.LogInformation("DemoReportsController.GetDemoPickerPerformance: Called with dateRange={DateRange}", dateRange);
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

                var transactions = await demoContext.Transactions
                    .Where(t => t.CustomerId == customerId && t.TransactionDate >= startDate && t.TransactionDate <= endDate)
                    .ToListAsync();

                var pickerPerformance = transactions
                    .GroupBy(t => t.PerformedBy)
                    .Select((g, idx) => new
                    {
                        id = idx + 1,
                        name = g.Key,
                        shift = idx % 3 == 0 ? "Morning" : idx % 3 == 1 ? "Afternoon" : "Night",
                        unitsPicked = g.Count(),
                        accuracy = 96 + (idx % 4),
                        avgTimePerUnit = 12 + (idx % 4),
                        status = "Active"
                    })
                    .Take(5)
                    .ToList();

                var kpis = new
                {
                    pickAccuracy = transactions.Count > 0 ? 97.8 : 0,
                    avgProcessingTime = 4.2,
                    pickRate = $"{(transactions.Count > 0 ? transactions.Count / Math.Max(1, (endDate - startDate).TotalHours) : 0):F0} units/hr",
                    onTimeShipRate = 94.5
                };

                return Ok(new
                {
                    kpis,
                    pickerPerformance,
                    trends = new object[0],
                    shiftPerformance = new object[0],
                    exceptions = new object[0]
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
        public async Task<IActionResult> GetDemoDemandForecast([FromQuery] int forecastDays = 30)
        {
            _logger.LogInformation($"DemoReportsController.GetDemoDemandForecast: Called with forecastDays={forecastDays}");
            try
            {
                var demoContext = GetDemoContext();
                var customerId = 2;

                // Get sales data for the last 90 days (production uses 90 days lookback)
                var cutoffDate = DateTime.UtcNow.AddDays(-90);
                var sales = await demoContext.Sales
                    .Where(s => s.CustomerId == customerId && s.SaleDate >= cutoffDate)
                    .ToListAsync();

                // Get all products
                var products = await demoContext.Products
                    .Where(p => p.CustomerId == customerId)
                    .ToListAsync();

                var productMap = products.ToDictionary(p => p.Sku, p => p);

                // Group sales by SKU and date
                var salesBySkuAndDate = sales
                    .GroupBy(s => new { s.Sku, Date = s.SaleDate.Date })
                    .Select(g => new
                    {
                        g.Key.Sku,
                        g.Key.Date,
                        Quantity = g.Sum(s => s.Quantity)
                    })
                    .OrderBy(x => x.Sku)
                    .ThenBy(x => x.Date)
                    .ToList();

                var forecasts = new List<DemoDemandForecastItem>();

                foreach (var skuGroup in salesBySkuAndDate.GroupBy(x => x.Sku))
                {
                    var sku = skuGroup.Key;
                    if (!productMap.TryGetValue(sku, out var product)) continue;

                    var dailySales = skuGroup.Select(g => (double)g.Quantity).ToList();
                    
                    // Calculate historical average daily demand
                    var avgDailyDemand = dailySales.Any() ? dailySales.Average() : 0;

                    // Calculate demand trend using recent data
                    var trendLookbackDays = Math.Min(60, Math.Max(forecastDays * 2, 14));
                    var recentSales = dailySales.TakeLast(trendLookbackDays).ToList();
                    var trend = CalculateSalesTrend(recentSales);

                    // Calculate forecasted demand
                    var forecastedDemand = avgDailyDemand * forecastDays * (1 + (trend / 100));

                    // Calculate variance and confidence
                    var variance = CalculateSalesVariance(dailySales);
                    var confidenceScore = Math.Max(0, Math.Min(100, 100 - (variance * 10)));

                    // Determine risk level based on variance
                    var riskLevel = variance > 0.5 ? "Critical" : variance > 0.3 ? "High" : variance > 0.15 ? "Medium" : "Low";

                    forecasts.Add(new DemoDemandForecastItem
                    {
                        Sku = sku,
                        ProductName = product.Name,
                        Category = product.Category ?? "Uncategorized",
                        HistoricalAvgDailyDemand = Math.Round(avgDailyDemand, 2),
                        ForecastedDemand = (int)forecastedDemand,
                        DemandTrend = Math.Round(trend, 2),
                        ConfidenceScore = (int)confidenceScore,
                        RiskLevel = riskLevel
                    });
                }

                // Sort by risk level and forecasted demand
                var riskOrder = new Dictionary<string, int> { { "Critical", 0 }, { "High", 1 }, { "Medium", 2 }, { "Low", 3 } };
                forecasts = forecasts
                    .OrderBy(f => riskOrder.TryGetValue(f.RiskLevel, out var order) ? order : 4)
                    .ThenByDescending(f => f.ForecastedDemand)
                    .ToList();

                // Calculate summary
                var summary = new
                {
                    totalSkusAnalyzed = forecasts.Count,
                    totalForecastedDemand = forecasts.Cast<dynamic>().Sum(f => (int)f.forecastedDemand),
                    avgDailyDemand = forecasts.Count > 0 ? Math.Round(forecasts.Cast<dynamic>().Average(f => (double)f.historicalAvgDailyDemand), 2) : 0,
                    criticalRiskCount = forecasts.Cast<dynamic>().Count(f => (string)f.riskLevel == "Critical"),
                    highRiskCount = forecasts.Cast<dynamic>().Count(f => (string)f.riskLevel == "High"),
                    mediumRiskCount = forecasts.Cast<dynamic>().Count(f => (string)f.riskLevel == "Medium"),
                    lowRiskCount = forecasts.Cast<dynamic>().Count(f => (string)f.riskLevel == "Low"),
                    forecastPeriodDays = forecastDays
                };

                return Ok(new
                {
                    summary,
                    topForecasts = forecasts.Take(10),
                    allForecasts = forecasts
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demo demand forecast");
                return StatusCode(500, new { message = "Error fetching demo demand forecast" });
            }
        }

        private double CalculateSalesTrend(List<double> dailySales)
        {
            if (dailySales.Count < 2) return 0;

            var n = dailySales.Count;
            var xValues = Enumerable.Range(0, n).Select(i => (double)i).ToList();
            var xMean = xValues.Average();
            var yMean = dailySales.Average();

            var numerator = xValues.Zip(dailySales, (x, y) => (x - xMean) * (y - yMean)).Sum();
            var denominator = xValues.Sum(x => Math.Pow(x - xMean, 2));

            if (denominator == 0) return 0;

            var slope = numerator / denominator;
            var trendPercent = (slope / yMean) * 100;
            return Math.Min(50, Math.Max(-50, trendPercent));
        }

        private double CalculateSalesVariance(List<double> dailySales)
        {
            if (dailySales.Count < 2) return 0.5;

            var mean = dailySales.Average();
            var variance = dailySales.Sum(x => Math.Pow(x - mean, 2)) / dailySales.Count;
            var stdDev = Math.Sqrt(variance);
            var coeffVar = mean > 0 ? (stdDev / mean) : 0.5;
            return Math.Min(1.0, coeffVar);
        }

        /// <summary>
        /// Get financial report for demo customer 2
        /// </summary>
        [HttpGet("customer/2/financial")]
        public async Task<IActionResult> GetDemoFinancial([FromQuery] string dateRange = "today")
        {
            _logger.LogInformation($"DemoReportsController.GetDemoFinancial: Called with dateRange={dateRange}");
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

                var sales = await demoContext.Sales
                    .Where(s => s.CustomerId == customerId && s.SaleDate >= startDate && s.SaleDate <= endDate)
                    .ToListAsync();

                var totalRevenue = sales.Sum(s => s.Price * s.Quantity);
                var totalUnits = sales.Sum(s => s.Quantity);
                var totalOrders = sales.GroupBy(s => s.OrderNumber).Count();

                var kpis = new
                {
                    totalRevenue = (int)totalRevenue,
                    grossProfit = (int)(totalRevenue * 0.4m),
                    totalOrders,
                    cogs = (int)(totalRevenue * 0.6m),
                    avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0m,
                    totalUnits,
                    grossMarginPercent = totalRevenue > 0 ? 40.0 : 0,
                    cogsPercent = totalRevenue > 0 ? 60.0 : 0
                };

                var categoryPerformance = sales
                    .GroupBy(s => s.Channel)
                    .Select(g => new { category = g.Key, revenue = g.Sum(s => s.Price * s.Quantity) })
                    .ToList();

                var metrics = new
                {
                    returnRate = 2.5,
                    customerLTV = 485.25,
                    inventoryTurnover = 3.4,
                    daysInventoryOutstanding = 107,
                    profitMargin = 22.5
                };

                var topProducts = sales
                    .GroupBy(s => s.Sku)
                    .Select((g, idx) => new
                    {
                        sku = g.Key,
                        productName = $"Product {g.Key}",
                        unitsSold = g.Sum(s => s.Quantity),
                        revenue = g.Sum(s => s.Price * s.Quantity),
                        cogs = g.Sum(s => s.Price * s.Quantity) * 0.6m,
                        profit = g.Sum(s => s.Price * s.Quantity) * 0.4m,
                        marginPercent = 40.0
                    })
                    .OrderByDescending(p => p.revenue)
                    .Take(8)
                    .ToList();

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
            return Ok(new
            {
                kpis = new { totalLocations = 0, totalInventoryValue = 0m, avgUtilization = 0, totalSkus = 0 },
                locations = new object[0],
                topSkus = new object[0]
            });
        }

        /// <summary>
        /// Get performance metrics for demo customer 2
        /// </summary>
        [HttpGet("customer/2/performance-metrics")]
        public async Task<IActionResult> GetDemoPerformanceMetrics([FromQuery] string timeframe = "90days")
        {
            _logger.LogInformation("DemoReportsController.GetDemoPerformanceMetrics: Called");
            try
            {
                var demoContext = GetDemoContext();
                var customerId = 2;
                var endDate = DateTime.UtcNow;
                
                int daysBack = timeframe switch
                {
                    "7days" => 7,
                    "30days" => 30,
                    "90days" => 90,
                    _ => 90 // Default 90 days to match historical sales
                };

                var startDate = endDate.AddDays(-daysBack);
                var previousPeriodStart = startDate.AddDays(-daysBack);

                // Get sales for current and previous periods
                var currentSales = await demoContext.Sales
                    .Where(s => s.CustomerId == customerId && s.SaleDate >= startDate && s.SaleDate <= endDate)
                    .ToListAsync();

                var previousSales = await demoContext.Sales
                    .Where(s => s.CustomerId == customerId && s.SaleDate >= previousPeriodStart && s.SaleDate < startDate)
                    .ToListAsync();

                // Get products for calculations
                var products = await demoContext.Products
                    .Where(p => p.CustomerId == customerId)
                    .ToListAsync();

                var productMap = products.ToDictionary(p => p.Id, p => p);

                // Calculate velocity metrics based on sales
                var velocityByProduct = currentSales
                    .GroupBy(s => s.Sku)
                    .Select(g =>
                    {
                        var unitsSold = g.Sum(s => s.Quantity);
                        var avgDailyVelocity = daysBack > 0 ? (decimal)unitsSold / daysBack : 0;
                        return new
                        {
                            sku = g.Key,
                            velocity = avgDailyVelocity,
                            unitsSold = unitsSold
                        };
                    })
                    .ToList();

                var avgVelocity = velocityByProduct.Any() ? velocityByProduct.Average(v => (double)v.velocity) : 0;
                var fastMovers = velocityByProduct.Count(v => v.velocity >= 10);
                var slowMovers = velocityByProduct.Count(v => v.velocity < 1);
                var totalProducts = products.Count;
                var activeSKUs = velocityByProduct.Count;
                var zeroStockSKUs = totalProducts - activeSKUs;

                // Calculate totals
                var totalUnitsSold = currentSales.Sum(s => s.Quantity);
                var previousUnitsSold = previousSales.Sum(s => s.Quantity);
                var unitsSoldGrowth = previousUnitsSold > 0 ? ((totalUnitsSold - previousUnitsSold) / (decimal)previousUnitsSold) * 100 : 0;

                var summary = new
                {
                    totalProducts = totalProducts,
                    totalMovements = currentSales.Count,
                    averageVelocity = Math.Round(avgVelocity, 2),
                    averageTurnover = Math.Round(totalProducts > 0 ? (double)totalUnitsSold / totalProducts : 0, 2),
                    fastMovers = fastMovers,
                    slowMovers = slowMovers,
                    unitsSold = totalUnitsSold,
                    unitsSoldGrowth = Math.Round((double)unitsSoldGrowth, 2),
                    averageStockCoverage = daysBack, // Days in the period
                    activeSKUs = activeSKUs,
                    zeroStockSKUs = zeroStockSKUs,
                    totalTransactions = currentSales.Count
                };

                var velocityMetrics = new
                {
                    averageVelocity = Math.Round(avgVelocity, 2),
                    fastMovingCount = velocityByProduct.Count(v => v.velocity >= 10),
                    mediumMovingCount = velocityByProduct.Count(v => v.velocity >= 5 && v.velocity < 10),
                    slowMovingCount = velocityByProduct.Count(v => v.velocity >= 1 && v.velocity < 5),
                    deadStockCount = velocityByProduct.Count(v => v.velocity < 1),
                    timeframeDays = daysBack
                };

                // Calculate trends
                var currentRevenue = currentSales.Sum(s => (decimal)s.Price * s.Quantity);
                var previousRevenue = previousSales.Sum(s => (decimal)s.Price * s.Quantity);
                var salesGrowth = previousUnitsSold > 0 ? ((totalUnitsSold - previousUnitsSold) / (decimal)previousUnitsSold) * 100 : 0;
                var revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

                var trends = new[]
                {
                    new { metric = "Sales Growth", change = Math.Round((double)salesGrowth, 2), direction = salesGrowth >= 0 ? "up" : "down" },
                    new { metric = "Revenue Growth", change = Math.Round((double)revenueGrowth, 2), direction = revenueGrowth >= 0 ? "up" : "down" },
                    new { metric = "Active Products", change = 0.0, direction = "stable" }
                };

                // Get top performers
                var topPerformers = velocityByProduct
                    .OrderByDescending(v => v.unitsSold)
                    .Take(5)
                    .Select(v => new
                    {
                        sku = v.sku,
                        unitsSold = v.unitsSold,
                        dailyVelocity = Math.Round(v.velocity, 2),
                        performance = "Fast Moving"
                    })
                    .ToList();

                // Get underperformers
                var underPerformers = velocityByProduct
                    .OrderBy(v => v.unitsSold)
                    .Take(5)
                    .Select(v => new
                    {
                        sku = v.sku,
                        unitsSold = v.unitsSold,
                        dailyVelocity = Math.Round(v.velocity, 2),
                        performance = v.unitsSold == 0 ? "Dead Stock" : "Slow Moving"
                    })
                    .ToList();

                return Ok(new
                {
                    summary = summary,
                    velocityMetrics = velocityMetrics,
                    trends = trends,
                    topPerformers = topPerformers,
                    underPerformers = underPerformers
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demo performance metrics");
                return StatusCode(500, new { message = "Error fetching demo performance metrics" });
            }
        }

        /// <summary>
        /// Get demo channel performance revenue data for customer 2
        /// </summary>
        [HttpGet("customer/2/channel-performance/revenue")]
        public async Task<IActionResult> GetDemoChannelRevenueByChannel([FromQuery] string? from = null, [FromQuery] string? to = null)
        {
            _logger.LogInformation("DemoReportsController.GetDemoChannelRevenueByChannel: Called with from={From}, to={To}", from, to);
            try
            {
                var demoContext = GetDemoContext();
                var customerId = 2; // Hard-coded demo customer

                // Parse dates from query string
                DateTime? fromDate = null;
                DateTime? toDate = null;

                if (!string.IsNullOrEmpty(from))
                {
                    if (DateTime.TryParse(from, out var parsedFrom))
                        fromDate = parsedFrom;
                }

                if (!string.IsNullOrEmpty(to))
                {
                    if (DateTime.TryParse(to, out var parsedTo))
                        toDate = parsedTo;
                }

                // Default to last 30 days
                if (fromDate == null && toDate == null)
                {
                    toDate = DateTime.UtcNow;
                    fromDate = toDate.Value.AddDays(-30);
                }

                var query = demoContext.Sales.Where(s => s.CustomerId == customerId);

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
                        channel = g.Key ?? "Unknown",
                        revenue = g.Sum(s => (decimal)s.Price),
                        quantity = g.Sum(s => s.Quantity),
                        transactions = g.Count()
                    })
                    .OrderByDescending(x => x.revenue)
                    .ToListAsync();

                return Ok(revenueByChannel);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demo channel revenue");
                return StatusCode(500, new { message = "Error fetching demo channel revenue" });
            }
        }

        /// <summary>
        /// Get demo top SKUs by channel for customer 2
        /// </summary>
        [HttpGet("customer/2/channel-performance/top-skus")]
        public async Task<IActionResult> GetDemoTopSkusByChannel([FromQuery] string? from = null, [FromQuery] string? to = null, [FromQuery] int limit = 10)
        {
            _logger.LogInformation("DemoReportsController.GetDemoTopSkusByChannel: Called with from={From}, to={To}, limit={Limit}", from, to, limit);
            try
            {
                var demoContext = GetDemoContext();
                var customerId = 2; // Hard-coded demo customer

                // Parse dates from query string
                DateTime? fromDate = null;
                DateTime? toDate = null;

                if (!string.IsNullOrEmpty(from))
                {
                    if (DateTime.TryParse(from, out var parsedFrom))
                        fromDate = parsedFrom;
                }

                if (!string.IsNullOrEmpty(to))
                {
                    if (DateTime.TryParse(to, out var parsedTo))
                        toDate = parsedTo;
                }

                // Default to last 30 days
                if (fromDate == null && toDate == null)
                {
                    toDate = DateTime.UtcNow;
                    fromDate = toDate.Value.AddDays(-30);
                }

                var query = demoContext.Sales.Where(s => s.CustomerId == customerId);

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

                var topSkus = await query
                    .GroupBy(s => new { s.Sku, s.Channel })
                    .Select(g => new
                    {
                        sku = g.Key.Sku,
                        channel = g.Key.Channel ?? "Unknown",
                        revenue = g.Sum(s => (decimal)s.Price),
                        quantity = g.Sum(s => s.Quantity),
                        transactions = g.Count()
                    })
                    .OrderByDescending(x => x.revenue)
                    .Take(limit)
                    .ToListAsync();

                return Ok(topSkus);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demo top SKUs by channel");
                return StatusCode(500, new { message = "Error fetching demo top SKUs by channel" });
            }
        }

        /// <summary>
        /// Get demo channel performance trends for customer 2
        /// </summary>
        [HttpGet("customer/2/channel-performance/trends")]
        public async Task<IActionResult> GetDemoChannelTrends([FromQuery] string? from = null, [FromQuery] string? to = null)
        {
            _logger.LogInformation("DemoReportsController.GetDemoChannelTrends: Called with from={From}, to={To}", from, to);
            try
            {
                var demoContext = GetDemoContext();
                var customerId = 2; // Hard-coded demo customer

                // Parse dates from query string
                DateTime? fromDate = null;
                DateTime? toDate = null;

                if (!string.IsNullOrEmpty(from))
                {
                    if (DateTime.TryParse(from, out var parsedFrom))
                        fromDate = parsedFrom;
                }

                if (!string.IsNullOrEmpty(to))
                {
                    if (DateTime.TryParse(to, out var parsedTo))
                        toDate = parsedTo;
                }

                // Default to last 30 days
                if (fromDate == null && toDate == null)
                {
                    toDate = DateTime.UtcNow;
                    fromDate = toDate.Value.AddDays(-30);
                }

                var query = demoContext.Sales.Where(s => s.CustomerId == customerId);

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

                var trends = await query
                    .GroupBy(s => new { Date = s.SaleDate.Date, s.Channel })
                    .Select(g => new
                    {
                        date = g.Key.Date,
                        channel = g.Key.Channel ?? "Unknown",
                        revenue = g.Sum(s => (decimal)s.Price),
                        quantity = g.Sum(s => s.Quantity),
                        transactions = g.Count()
                    })
                    .OrderBy(x => x.date)
                    .ThenBy(x => x.channel)
                    .ToListAsync();

                return Ok(trends);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demo channel trends");
                return StatusCode(500, new { message = "Error fetching demo channel trends" });
            }
        }

        /// <summary>
        /// Get demo picker analytics for customer 2
        /// </summary>
        [HttpGet("customer/2/picker-analytics")]
        public async Task<ActionResult> GetPickerAnalytics([FromQuery] string dateRange = "today")
        {
            try
            {
                _logger.LogInformation($"GetPickerAnalytics: Called with dateRange={dateRange}");
                
                // Get the demo database context
                var demoContext = GetDemoContext();

                // Determine date filter based on dateRange parameter
                var now = DateTime.UtcNow;
                var startDate = dateRange switch
                {
                    "yesterday" => now.AddDays(-1).Date,
                    "last7days" => now.AddDays(-7).Date,
                    "last30days" => now.AddDays(-30).Date,
                    _ => now.Date // "today"
                };

                _logger.LogInformation($"Querying transactions from {startDate} to {now}");

                // Get picker transactions from demo database
                var pickTransactions = await demoContext.Transactions
                    .Where(t => t.CustomerId == 2 && 
                                t.TransactionType == "Pick" && 
                                t.TransactionDate >= startDate)
                    .ToListAsync();

                _logger.LogInformation($"Found {pickTransactions.Count} pick transactions");

                if (!pickTransactions.Any())
                {
                    return Ok(new
                    {
                        totalPickers = 0,
                        avgPicksPerHour = 0.0,
                        avgAccuracy = 0.0,
                        totalPicks = 0,
                        pickers = Array.Empty<object>()
                    });
                }

                // Group by picker and calculate statistics
                var pickerStats = pickTransactions
                    .GroupBy(t => t.PerformedBy ?? t.User ?? "Unknown")
                    .Select(g => new
                    {
                        name = g.Key,
                        picks = g.Sum(t => Math.Abs(t.Quantity)),
                        pickCount = g.Count(),
                        picksPerHour = Math.Round((double)g.Sum(t => Math.Abs(t.Quantity)) / 8.0, 1), // Standard 8-hour shift
                        accuracy = 95.5, // Standard accuracy for demo
                        trend = (g.Count() % 2 == 0) ? 1.5 : -0.8
                    })
                    .OrderByDescending(p => p.picks)
                    .ToList();

                var summary = new
                {
                    totalPickers = pickerStats.Count,
                    avgPicksPerHour = pickerStats.Any() ? Math.Round(pickerStats.Average(p => p.picksPerHour), 1) : 0.0,
                    avgAccuracy = pickerStats.Any() ? Math.Round(pickerStats.Average(p => p.accuracy), 1) : 0.0,
                    totalPicks = pickerStats.Sum(p => p.picks),
                    pickers = pickerStats
                };

                _logger.LogInformation($"Returning picker stats: {pickerStats.Count} pickers, {summary.totalPicks} total picks");
                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching demo picker analytics");
                return StatusCode(500, new { message = "Error fetching demo picker analytics" });
            }
        }

        private class DemoDemandForecastItem
        {
            public string Sku { get; set; } = string.Empty;
            public string ProductName { get; set; } = string.Empty;
            public string Category { get; set; } = string.Empty;
            public double HistoricalAvgDailyDemand { get; set; }
            public int ForecastedDemand { get; set; }
            public double DemandTrend { get; set; }
            public int ConfidenceScore { get; set; }
            public string RiskLevel { get; set; } = string.Empty;
        }
    }
}
