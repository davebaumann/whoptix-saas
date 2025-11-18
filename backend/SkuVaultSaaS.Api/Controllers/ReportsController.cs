using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Api.Services;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Core.Services;
using SkuVaultSaaS.Core.Enums;

namespace SkuVaultSaaS.Api.Controllers
{
    public class AgingInventoryItem
    {
        public string Sku { get; set; } = string.Empty;
        public int CurrentQuantity { get; set; }
        public int Days0_30 { get; set; }
        public int Days31_60 { get; set; }
        public int Days61_90 { get; set; }
        public int Days90Plus { get; set; }
        public DateTime OldestReceiveDate { get; set; }
        public double AverageDaysOld { get; set; }
    }

    public class AgingInventorySummary
    {
        public int TotalSkus { get; set; }
        public int TotalQuantity { get; set; }
        public int Days0_30_Total { get; set; }
        public int Days31_60_Total { get; set; }
        public int Days61_90_Total { get; set; }
        public int Days90Plus_Total { get; set; }
    }

    public class FinancialWarehouseItem
    {
        public string Sku { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public string? Warehouse { get; set; }
        public string? Location { get; set; }
        public int Quantity { get; set; }
        public decimal? Cost { get; set; }
        public decimal? Price { get; set; }
        public decimal TotalCostValue { get; set; }
        public decimal TotalRetailValue { get; set; }
    }

    public class FinancialWarehouseSummary
    {
        public string Period { get; set; } = string.Empty;
        public DateTime ReportDate { get; set; }
        public int TotalSkus { get; set; }
        public int TotalQuantity { get; set; }
        public decimal TotalCostValue { get; set; }
        public decimal TotalRetailValue { get; set; }
        public decimal PotentialProfit { get; set; }
        public decimal AverageCostPerUnit { get; set; }
        public decimal AverageRetailPerUnit { get; set; }
        public List<WarehouseBreakdown> WarehouseBreakdowns { get; set; } = new List<WarehouseBreakdown>();
    }

    public class WarehouseBreakdown
    {
        public string Warehouse { get; set; } = string.Empty;
        public int TotalQuantity { get; set; }
        public decimal TotalCostValue { get; set; }
        public decimal TotalRetailValue { get; set; }
        public int UniqueSkus { get; set; }
    }

    public class InventoryItem
    {
        public string Sku { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public string LocationCode { get; set; } = string.Empty;
        public string LocationName { get; set; } = string.Empty;
        public string Warehouse { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal? Cost { get; set; }
        public decimal? RetailPrice { get; set; }
        public decimal TotalCostValue { get; set; }
        public decimal TotalRetailValue { get; set; }
        public string? Category { get; set; }
        public bool IsLowStock { get; set; }
        public int? ThresholdQuantity { get; set; }
    }

    public class InventoryOverview
    {
        public int TotalSkus { get; set; }
        public int TotalQuantity { get; set; }
        public decimal TotalCostValue { get; set; }
        public decimal TotalRetailValue { get; set; }
        public int LowStockCount { get; set; }
        public int OutOfStockCount { get; set; }
        public List<InventoryItem> Items { get; set; } = new List<InventoryItem>();
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserContextService _userContextService;
        private readonly ILogger<ReportsController> _logger;
        private readonly IReportAccessService _reportAccessService;

        public ReportsController(
            ApplicationDbContext context, 
            UserContextService userContextService,
            ILogger<ReportsController> logger,
            IReportAccessService reportAccessService)
        {
            _context = context;
            _userContextService = userContextService;
            _logger = logger;
            _reportAccessService = reportAccessService;
        }

        private async Task<bool> CanAccessCustomerAsync(int customerId)
        {
            return await _userContextService.CanAccessCustomerAsync(customerId);
        }

        private async Task<IActionResult> CheckReportAccessAsync(int customerId, string reportName)
        {
            // First check tenant isolation
            if (!await CanAccessCustomerAsync(customerId))
            {
                return Forbid("Access denied to this customer's data");
            }

            // Then check membership level
            var customer = await _context.Customers.FindAsync(customerId);
            if (customer == null)
            {
                return NotFound("Customer not found");
            }

            if (!_reportAccessService.CanAccessReport(customer.MembershipLevel, reportName))
            {
                var requiredLevel = _reportAccessService.GetRequiredMembershipLevel(reportName);
                return StatusCode(403, new
                {
                    message = $"Access denied. This report requires {requiredLevel} membership.",
                    currentLevel = customer.MembershipLevel.ToString(),
                    requiredLevel = requiredLevel.ToString(),
                    reportName = reportName
                });
            }

            return null; // Access granted
        }

        [HttpGet("customer/{customerId}/inventory")]
        [Authorize]
        public async Task<IActionResult> GetInventoryReport(int customerId)
        {
            // Check tenant access and membership level
            var accessCheck = await CheckReportAccessAsync(customerId, "inventory");
            if (accessCheck != null) return accessCheck;

            try
            {
                // Get all inventory levels for the customer (use QuantityAvailable like low stock report)
                var inventoryLevels = await _context.InventoryLevels
                    .Where(il => il.CustomerId == customerId && il.QuantityAvailable > 0)
                    .Include(il => il.Product)
                    .Include(il => il.Location)
                    .ToListAsync();

                // Get low stock thresholds
                var lowStockThresholds = await _context.LowStockThresholds
                    .Where(lst => lst.CustomerId == customerId && lst.IsActive)
                    .ToListAsync();

                var items = new List<InventoryItem>();

                foreach (var level in inventoryLevels)
                {
                    // Check for specific threshold (product + location)
                    var specificThreshold = lowStockThresholds
                        .FirstOrDefault(t => t.ProductId == level.ProductId && t.LocationId == level.LocationId);
                    
                    // Check for general threshold (product only, any location)
                    var generalThreshold = lowStockThresholds
                        .FirstOrDefault(t => t.ProductId == level.ProductId && t.LocationId == null);
                    
                    var threshold = specificThreshold ?? generalThreshold;
                    var thresholdQty = threshold?.ThresholdQuantity ?? 10; // Use default threshold like low stock report
                    var isLowStock = level.QuantityAvailable <= thresholdQty;

                    var costValue = (level.Product.Cost ?? 0) * level.QuantityAvailable;
                    var retailValue = (level.Product.Price ?? 0) * level.QuantityAvailable;

                    items.Add(new InventoryItem
                    {
                        Sku = level.Product.Sku,
                        ProductName = level.Product.Name,
                        LocationCode = level.Location.Code,
                        LocationName = level.Location.Name ?? level.Location.Code,
                        Warehouse = level.Location.Warehouse ?? "",
                        Quantity = level.QuantityAvailable,
                        Cost = level.Product.Cost,
                        RetailPrice = level.Product.Price,
                        TotalCostValue = costValue,
                        TotalRetailValue = retailValue,
                        Category = level.Product.Category,
                        IsLowStock = isLowStock,
                        ThresholdQuantity = thresholdQty
                    });
                }

                var overview = new InventoryOverview
                {
                    TotalSkus = items.Select(i => i.Sku).Distinct().Count(),
                    TotalQuantity = items.Sum(i => i.Quantity),
                    TotalCostValue = items.Sum(i => i.TotalCostValue),
                    TotalRetailValue = items.Sum(i => i.TotalRetailValue),
                    LowStockCount = items.Count(i => i.IsLowStock),
                    OutOfStockCount = 0, // We already filtered out zero quantities
                    Items = items.OrderBy(i => i.Sku).ThenBy(i => i.LocationCode).ToList()
                };

                return Ok(overview);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating inventory report for customer {CustomerId}", customerId);
                return StatusCode(500, "Error generating inventory report");
            }
        }

        [HttpGet("customer/{customerId}/aging-inventory")]
        [Authorize]
        public async Task<IActionResult> GetAgingInventoryReport(int customerId)
        {
            // Check tenant access and membership level
            var accessCheck = await CheckReportAccessAsync(customerId, "aging-inventory");
            if (accessCheck != null) return accessCheck;

            try
            {
                // Get all transactions for the customer
                var allTransactions = await _context.Transactions
                    .AsNoTracking()
                    .Where(t => t.CustomerId == customerId)
                    .OrderBy(t => t.TransactionDate)
                    .ToListAsync();

                var agingResults = new List<AgingInventoryItem>();
                
                // If no transactions exist, return empty result
                if (!allTransactions.Any())
                {
                    var emptySummary = new AgingInventorySummary
                    {
                        TotalSkus = 0,
                        TotalQuantity = 0,
                        Days0_30_Total = 0,
                        Days31_60_Total = 0,
                        Days61_90_Total = 0,
                        Days90Plus_Total = 0
                    };

                    return Ok(new
                    {
                        reportDate = DateTime.UtcNow,
                        summary = emptySummary,
                        details = agingResults
                    });
                }

                // Calculate current inventory levels per SKU
                var currentInventory = allTransactions
                    .GroupBy(t => t.Sku)
                    .Select(g => new
                    {
                        Sku = g.Key,
                        CurrentQuantity = g.Sum(t => t.Quantity),
                        Transactions = g.ToList()
                    })
                    .Where(x => x.CurrentQuantity > 0) // Only include SKUs with positive inventory
                    .ToList();

                var cutoffDate = DateTime.UtcNow.Date;

                foreach (var item in currentInventory)
                {
                    try
                    {
                        // Get the oldest "Add" or "Return" transaction date for aging calculation
                        var firstAddTransaction = item.Transactions
                            .Where(t => (t.TransactionType == "Add" || t.TransactionType == "Return") && t.Quantity > 0)
                            .OrderBy(t => t.TransactionDate)
                            .FirstOrDefault();

                        DateTime oldestDate = firstAddTransaction?.TransactionDate ?? 
                                           item.Transactions.OrderBy(t => t.TransactionDate).First().TransactionDate;
                        var daysOld = (cutoffDate - oldestDate.Date).Days;

                        // Ensure daysOld is not negative
                        daysOld = Math.Max(0, daysOld);

                        // Simple aging buckets based on oldest Add transaction
                        var days0_30 = daysOld <= 30 ? item.CurrentQuantity : 0;
                        var days31_60 = daysOld > 30 && daysOld <= 60 ? item.CurrentQuantity : 0;
                        var days61_90 = daysOld > 60 && daysOld <= 90 ? item.CurrentQuantity : 0;
                        var days90Plus = daysOld > 90 ? item.CurrentQuantity : 0;

                        agingResults.Add(new AgingInventoryItem
                        {
                            Sku = item.Sku,
                            CurrentQuantity = item.CurrentQuantity,
                            Days0_30 = days0_30,
                            Days31_60 = days31_60,
                            Days61_90 = days61_90,
                            Days90Plus = days90Plus,
                            OldestReceiveDate = oldestDate,
                            AverageDaysOld = daysOld
                        });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Error calculating aging for SKU {Sku}", item.Sku);
                        // Continue processing other items
                    }
                }

                var summary = new AgingInventorySummary
                {
                    TotalSkus = agingResults.Count,
                    TotalQuantity = agingResults.Sum(x => x.CurrentQuantity),
                    Days0_30_Total = agingResults.Sum(x => x.Days0_30),
                    Days31_60_Total = agingResults.Sum(x => x.Days31_60),
                    Days61_90_Total = agingResults.Sum(x => x.Days61_90),
                    Days90Plus_Total = agingResults.Sum(x => x.Days90Plus)
                };

                return Ok(new
                {
                    reportDate = DateTime.UtcNow,
                    summary,
                    details = agingResults.OrderBy(x => x.Sku).ToList()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating aging inventory report for customer {CustomerId}", customerId);
                return StatusCode(500, "Error generating aging inventory report");
            }
        }

        [HttpGet("customer/{customerId}/inventory-turnover")]
        public async Task<IActionResult> GetInventoryTurnoverReport(int customerId, [FromQuery] int days = 90)
        {
            // Check tenant isolation
            if (!await CanAccessCustomerAsync(customerId))
            {
                return Forbid("Access denied to this customer's data");
            }

            try
            {
                var endDate = DateTime.UtcNow.Date;
                var startDate = endDate.AddDays(-days);

                var transactions = await _context.Transactions
                    .AsNoTracking()
                    .Where(t => t.CustomerId == customerId && t.TransactionDate >= startDate)
                    .ToListAsync();

                var turnoverData = transactions
                    .GroupBy(t => t.Sku)
                    .Select(g => new
                    {
                        Sku = g.Key,
                        TotalSold = g.Where(t => t.TransactionType == "Remove" && t.Quantity < 0).Sum(t => Math.Abs(t.Quantity)),
                        TotalReceived = g.Where(t => (t.TransactionType == "Add" || t.TransactionType == "Return") && t.Quantity > 0).Sum(t => t.Quantity),
                        CurrentStock = g.Sum(t => t.Quantity),
                        TransactionCount = g.Count(),
                        FirstTransaction = g.Min(t => t.TransactionDate),
                        LastTransaction = g.Max(t => t.TransactionDate)
                    })
                    .Where(x => x.TotalSold > 0 || x.CurrentStock > 0)
                    .Select(x => new
                    {
                        x.Sku,
                        x.TotalSold,
                        x.TotalReceived,
                        x.CurrentStock,
                        x.TransactionCount,
                        x.FirstTransaction,
                        x.LastTransaction,
                        TurnoverRate = x.CurrentStock > 0 ? Math.Round((double)x.TotalSold / x.CurrentStock, 2) : 0,
                        DaysOnHand = x.TotalSold > 0 ? Math.Round((double)x.CurrentStock / (x.TotalSold / (double)days) * days, 1) : double.MaxValue
                    })
                    .OrderByDescending(x => x.TurnoverRate)
                    .ToList();

                return Ok(new
                {
                    ReportPeriod = $"{startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}",
                    PeriodDays = days,
                    TurnoverData = turnoverData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating inventory turnover report for customer {CustomerId}", customerId);
                return StatusCode(500, "Error generating inventory turnover report");
            }
        }

        [HttpGet("customer/{customerId}/financial-warehouse")]
        [Authorize]
        public async Task<IActionResult> GetFinancialWarehouseReport(int customerId, [FromQuery] string period = "current")
        {
            // Check tenant access and membership level
            var accessCheck = await CheckReportAccessAsync(customerId, "financial-warehouse");
            if (accessCheck != null) return accessCheck;

            try
            {
                var reportDate = DateTime.UtcNow.Date;
                DateTime? cutoffDate = null;
                string periodLabel = "Current";

                // Determine the cutoff date based on period
                switch (period.ToLower())
                {
                    case "monthly":
                        cutoffDate = new DateTime(reportDate.Year, reportDate.Month, 1);
                        periodLabel = $"Monthly - {reportDate:MMMM yyyy}";
                        break;
                    case "quarterly":
                        var quarter = (reportDate.Month - 1) / 3 + 1;
                        var quarterStartMonth = (quarter - 1) * 3 + 1;
                        cutoffDate = new DateTime(reportDate.Year, quarterStartMonth, 1);
                        periodLabel = $"Quarterly - Q{quarter} {reportDate.Year}";
                        break;
                    case "annual":
                        cutoffDate = new DateTime(reportDate.Year, 1, 1);
                        periodLabel = $"Annual - {reportDate.Year}";
                        break;
                    default:
                        periodLabel = "Current Inventory Snapshot";
                        break;
                }

                // Get current inventory levels from InventoryLevels table (same as other reports)
                var inventoryLevels = await _context.InventoryLevels
                    .Where(il => il.CustomerId == customerId && il.QuantityAvailable > 0)
                    .Include(il => il.Product)
                    .Include(il => il.Location)
                    .AsNoTracking()
                    .ToListAsync();

                _logger.LogInformation("Found {InventoryCount} inventory items for customer {CustomerId}", 
                    inventoryLevels.Count, customerId);

                // Create financial warehouse items from inventory levels
                var financialItems = new List<FinancialWarehouseItem>();

                foreach (var level in inventoryLevels)
                {
                    var cost = level.Product?.Cost ?? 0m;
                    var price = level.Product?.Price ?? 0m;
                    var warehouse = level.Location?.Warehouse ?? "Unknown";
                    var location = level.Location?.Code ?? "Unknown";

                    financialItems.Add(new FinancialWarehouseItem
                    {
                        Sku = level.Product?.Sku ?? "Unknown",
                        ProductName = level.Product?.Name ?? "Unknown Product",
                        Warehouse = warehouse,
                        Location = location,
                        Quantity = level.QuantityAvailable,
                        Cost = cost,
                        Price = price,
                        TotalCostValue = cost * level.QuantityAvailable,
                        TotalRetailValue = price * level.QuantityAvailable
                    });
                }

                // Calculate warehouse breakdowns
                var warehouseBreakdowns = financialItems
                    .GroupBy(f => f.Warehouse ?? "Unknown")
                    .Select(g => new WarehouseBreakdown
                    {
                        Warehouse = g.Key,
                        TotalQuantity = g.Sum(f => f.Quantity),
                        TotalCostValue = g.Sum(f => f.TotalCostValue),
                        TotalRetailValue = g.Sum(f => f.TotalRetailValue),
                        UniqueSkus = g.Count()
                    })
                    .OrderByDescending(w => w.TotalCostValue)
                    .ToList();

                // Calculate overall summary
                var totalQuantity = financialItems.Sum(f => f.Quantity);
                var totalCostValue = financialItems.Sum(f => f.TotalCostValue);
                var totalRetailValue = financialItems.Sum(f => f.TotalRetailValue);

                var summary = new FinancialWarehouseSummary
                {
                    Period = periodLabel,
                    ReportDate = reportDate,
                    TotalSkus = financialItems.Count,
                    TotalQuantity = totalQuantity,
                    TotalCostValue = totalCostValue,
                    TotalRetailValue = totalRetailValue,
                    PotentialProfit = totalRetailValue - totalCostValue,
                    AverageCostPerUnit = totalQuantity > 0 ? totalCostValue / totalQuantity : 0,
                    AverageRetailPerUnit = totalQuantity > 0 ? totalRetailValue / totalQuantity : 0,
                    WarehouseBreakdowns = warehouseBreakdowns
                };

                return Ok(new
                {
                    summary = summary,
                    details = financialItems.OrderByDescending(f => f.TotalCostValue)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating financial warehouse report for customer {CustomerId}", customerId);
                return StatusCode(500, "Error generating financial warehouse report");
            }
        }

        [HttpGet("customer/{customerId}/locations")]
        [Authorize]
        public async Task<IActionResult> GetLocationsReport(int customerId)
        {
            // Check tenant access and membership level
            var accessCheck = await CheckReportAccessAsync(customerId, "locations");
            if (accessCheck != null) return accessCheck;

            try
            {
                // Get inventory levels with location data
                var inventoryLevels = await _context.InventoryLevels
                    .Where(il => il.CustomerId == customerId && il.QuantityAvailable > 0)
                    .Include(il => il.Product)
                    .Include(il => il.Location)
                    .AsNoTracking()
                    .ToListAsync();

                // Group by location and calculate metrics
                var locationAnalytics = inventoryLevels
                    .GroupBy(il => new { 
                        LocationId = il.LocationId,
                        LocationCode = il.Location.Code,
                        LocationName = il.Location.Name ?? il.Location.Code,
                        Warehouse = il.Location.Warehouse ?? "Unknown"
                    })
                    .Select(g => new LocationAnalytic
                    {
                        LocationId = g.Key.LocationId,
                        LocationCode = g.Key.LocationCode,
                        LocationName = g.Key.LocationName,
                        Warehouse = g.Key.Warehouse,
                        TotalSkus = g.Count(),
                        TotalQuantity = g.Sum(x => x.QuantityAvailable),
                        TotalCostValue = g.Sum(x => (x.Product.Cost ?? 0) * x.QuantityAvailable),
                        TotalRetailValue = g.Sum(x => (x.Product.Price ?? 0) * x.QuantityAvailable),
                        AverageQuantityPerSku = g.Count() > 0 ? (decimal)g.Sum(x => x.QuantityAvailable) / g.Count() : 0,
                        LowStockItems = g.Count(x => {
                            // Check for low stock thresholds
                            var specificThreshold = _context.LowStockThresholds
                                .FirstOrDefault(t => t.CustomerId == customerId && 
                                               t.ProductId == x.ProductId && 
                                               t.LocationId == x.LocationId && 
                                               t.IsActive);
                            var generalThreshold = _context.LowStockThresholds
                                .FirstOrDefault(t => t.CustomerId == customerId && 
                                               t.ProductId == x.ProductId && 
                                               t.LocationId == null && 
                                               t.IsActive);
                            var threshold = specificThreshold ?? generalThreshold;
                            var thresholdQty = threshold?.ThresholdQuantity ?? 10;
                            return x.QuantityAvailable <= thresholdQty;
                        }),
                        UtilizationScore = CalculateUtilizationScore(g.ToList())
                    })
                    .OrderByDescending(l => l.TotalCostValue)
                    .ToList();

                // Calculate warehouse summaries
                var warehouseSummaries = locationAnalytics
                    .GroupBy(l => l.Warehouse)
                    .Select(g => new WarehouseSummary
                    {
                        WarehouseName = g.Key,
                        LocationCount = g.Count(),
                        TotalSkus = g.Sum(l => l.TotalSkus),
                        TotalQuantity = g.Sum(l => l.TotalQuantity),
                        TotalCostValue = g.Sum(l => l.TotalCostValue),
                        TotalRetailValue = g.Sum(l => l.TotalRetailValue),
                        AverageUtilization = g.Any() ? g.Average(l => l.UtilizationScore) : 0
                    })
                    .OrderByDescending(w => w.TotalCostValue)
                    .ToList();

                var overallSummary = new LocationReportSummary
                {
                    TotalLocations = locationAnalytics.Count,
                    TotalWarehouses = warehouseSummaries.Count,
                    TotalSkus = locationAnalytics.Sum(l => l.TotalSkus),
                    TotalQuantity = locationAnalytics.Sum(l => l.TotalQuantity),
                    TotalCostValue = locationAnalytics.Sum(l => l.TotalCostValue),
                    TotalRetailValue = locationAnalytics.Sum(l => l.TotalRetailValue),
                    AverageUtilization = locationAnalytics.Any() ? locationAnalytics.Average(l => l.UtilizationScore) : 0,
                    TopLocation = locationAnalytics.FirstOrDefault()?.LocationName ?? "N/A",
                    LowStockLocations = locationAnalytics.Count(l => l.LowStockItems > 0)
                };

                return Ok(new
                {
                    summary = overallSummary,
                    warehouses = warehouseSummaries,
                    locations = locationAnalytics
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating locations report for customer {CustomerId}", customerId);
                return StatusCode(500, "Error generating locations report");
            }
        }

        [HttpGet("customer/{customerId}/performance")]
        [Authorize]
        public async Task<IActionResult> GetPerformanceReport(int customerId)
        {
            // Check tenant access and membership level
            var accessCheck = await CheckReportAccessAsync(customerId, "performance");
            if (accessCheck != null) return accessCheck;

            try
            {
                var endDate = DateTime.UtcNow;
                var startDate = endDate.AddDays(-7); // Changed from -30 to -7 days for testing
                var previousPeriodStart = startDate.AddDays(-7);

                // Get inventory movements for current and previous periods
                var currentPeriodMovements = await _context.InventoryMovements
                    .Where(im => im.CustomerId == customerId && 
                               im.OccurredAtUtc >= startDate && 
                               im.OccurredAtUtc <= endDate)
                    .Include(im => im.Product)
                    .AsNoTracking()
                    .ToListAsync();

                var previousPeriodMovements = await _context.InventoryMovements
                    .Where(im => im.CustomerId == customerId && 
                               im.OccurredAtUtc >= previousPeriodStart && 
                               im.OccurredAtUtc < startDate)
                    .Include(im => im.Product)
                    .AsNoTracking()
                    .ToListAsync();

                // Get current inventory levels
                var inventoryLevels = await _context.InventoryLevels
                    .Where(il => il.CustomerId == customerId && il.QuantityAvailable > 0)
                    .Include(il => il.Product)
                    .AsNoTracking()
                    .ToListAsync();

                // Calculate velocity metrics
                var velocityMetrics = CalculateVelocityMetrics(currentPeriodMovements, inventoryLevels);
                
                // Calculate turnover metrics
                var turnoverMetrics = CalculateTurnoverMetrics(currentPeriodMovements, inventoryLevels);
                
                // Calculate performance trends
                var performanceTrends = CalculatePerformanceTrends(currentPeriodMovements, previousPeriodMovements);
                
                // Get top performers
                var topPerformers = GetTopPerformers(currentPeriodMovements, inventoryLevels);
                
                // Get underperformers
                var underPerformers = GetUnderPerformers(inventoryLevels, currentPeriodMovements);

                var totalUnitsSold = currentPeriodMovements.Where(m => m.TransactionType == "Pick" || m.TransactionType == "Sale").Sum(m => Math.Abs(m.QuantityChange));
                var previousUnitsSold = previousPeriodMovements.Where(m => m.TransactionType == "Pick" || m.TransactionType == "Sale").Sum(m => Math.Abs(m.QuantityChange));
                var unitsSoldGrowth = previousUnitsSold > 0 ? ((totalUnitsSold - previousUnitsSold) / (decimal)previousUnitsSold) * 100 : 0;

                var performanceSummary = new PerformanceReportSummary
                {
                    TotalProducts = inventoryLevels.Select(il => il.ProductId).Distinct().Count(),
                    TotalMovements = currentPeriodMovements.Count,
                    AverageVelocity = velocityMetrics.Any() ? velocityMetrics.Average(v => v.Velocity) : 0,
                    AverageTurnover = turnoverMetrics.Any() ? turnoverMetrics.Average(t => t.TurnoverRate) : 0,
                    FastMovers = velocityMetrics.Count(v => v.Velocity > 10), // More than 10 units per day
                    SlowMovers = velocityMetrics.Count(v => v.Velocity < 1), // Less than 1 unit per day
                    TotalRevenue = currentPeriodMovements.Where(m => m.TransactionType == "Pick" || m.TransactionType == "Sale").Sum(m => Math.Abs(m.QuantityChange) * (m.Product.Cost ?? 0)),
                    RevenueGrowth = CalculateRevenueGrowth(currentPeriodMovements, previousPeriodMovements),
                    UnitsSold = (int)totalUnitsSold,
                    UnitsSoldGrowth = (double)unitsSoldGrowth,
                    AverageStockCoverage = inventoryLevels.Any() ? inventoryLevels.Average(il => il.QuantityOnHand * 30) : 0, // Rough estimate
                    ActiveSKUs = inventoryLevels.Count(il => il.QuantityOnHand > 0),
                    ZeroStockSKUs = inventoryLevels.Count(il => il.QuantityOnHand == 0),
                    TotalTransactions = currentPeriodMovements.Count
                };

                return Ok(new
                {
                    summary = performanceSummary,
                    velocityMetrics = new {
                        averageVelocity = velocityMetrics.Any() ? velocityMetrics.Average(v => v.Velocity) : 0,
                        fastMovingCount = velocityMetrics.Count(v => v.Velocity >= 10),
                        mediumMovingCount = velocityMetrics.Count(v => v.Velocity >= 5 && v.Velocity < 10),
                        slowMovingCount = velocityMetrics.Count(v => v.Velocity >= 1 && v.Velocity < 5),
                        deadStockCount = velocityMetrics.Count(v => v.Velocity < 1)
                    },
                    turnoverMetrics = new {
                        averageTurnover = turnoverMetrics.Any() ? turnoverMetrics.Average(t => t.TurnoverRate) : 0
                    },
                    trends = new[] {
                        new { metric = "Sales Growth", change = (double)performanceTrends.SalesGrowth, direction = performanceTrends.SalesGrowth >= 0 ? "up" : "down" },
                        new { metric = "Revenue Growth", change = (double)performanceTrends.RevenueGrowth, direction = performanceTrends.RevenueGrowth >= 0 ? "up" : "down" },
                        new { metric = "Movement Growth", change = (double)performanceTrends.MovementGrowth, direction = performanceTrends.MovementGrowth >= 0 ? "up" : "down" },
                        new { metric = "Active Products", change = 0.0, direction = "stable" }
                    },
                    topPerformers = topPerformers,
                    underPerformers = underPerformers,
                    // Debug information
                    debugInfo = new
                    {
                        dateRange = new { startDate, endDate },
                        currentPeriodMovementsCount = currentPeriodMovements.Count,
                        previousPeriodMovementsCount = previousPeriodMovements.Count,
                        inventoryLevelsCount = inventoryLevels.Count,
                        customerId = customerId,
                        movementDateRange = currentPeriodMovements.Any() ? 
                            new { 
                                earliest = currentPeriodMovements.Min(m => m.OccurredAtUtc),
                                latest = currentPeriodMovements.Max(m => m.OccurredAtUtc)
                            } : null,
                        sampleMovements = currentPeriodMovements.Take(3).Select(m => new {
                            m.TransactionType,
                            m.QuantityChange,
                            m.OccurredAtUtc,
                            ProductSku = m.Product.Sku
                        }).ToList()
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating performance report for customer {CustomerId}", customerId);
                return StatusCode(500, "Error generating performance report");
            }
        }

        private decimal CalculateUtilizationScore(List<InventoryLevel> locationItems)
        {
            if (!locationItems.Any()) return 0;

            // Simple utilization score based on:
            // - Number of different SKUs (diversity)
            // - Total quantity relative to location capacity (assumed max 1000 per location)
            // - Value density (high value items get better score)
            
            var skuCount = locationItems.Count;
            var totalQuantity = locationItems.Sum(x => x.QuantityAvailable);
            var totalValue = locationItems.Sum(x => (x.Product.Cost ?? 0) * x.QuantityAvailable);
            
            var diversityScore = Math.Min(skuCount / 10.0m, 1.0m) * 40; // Max 40 points for diversity
            var quantityScore = Math.Min(totalQuantity / 100.0m, 1.0m) * 30; // Max 30 points for quantity
            var valueScore = Math.Min(totalValue / 10000.0m, 1.0m) * 30; // Max 30 points for value
            
            return diversityScore + quantityScore + valueScore;
        }

        private List<VelocityMetric> CalculateVelocityMetrics(List<InventoryMovement> movements, List<InventoryLevel> inventory)
        {
            var velocityMetrics = new List<VelocityMetric>();
            
            foreach (var product in inventory.GroupBy(il => il.Product))
            {
                var productMovements = movements.Where(m => m.ProductId == product.Key.Id).ToList();
                var outboundQuantity = productMovements
                    .Where(m => m.TransactionType == "Pick" || m.TransactionType == "Sale" || 
                               (m.TransactionType == "Adjust" && m.QuantityChange < 0))
                    .Sum(m => Math.Abs(m.QuantityChange));
                
                var averageStock = product.Sum(p => p.QuantityAvailable);
                var velocity = outboundQuantity / 30.0; // Daily velocity over 30 days
                
                velocityMetrics.Add(new VelocityMetric
                {
                    ProductSku = product.Key.Sku,
                    ProductName = product.Key.Name,
                    CurrentStock = averageStock,
                    Velocity = (decimal)velocity,
                    DaysOfStock = velocity > 0 ? (decimal)(averageStock / velocity) : 999,
                    TotalMovements = productMovements.Count
                });
            }
            
            return velocityMetrics;
        }

        private List<TurnoverMetric> CalculateTurnoverMetrics(List<InventoryMovement> movements, List<InventoryLevel> inventory)
        {
            var turnoverMetrics = new List<TurnoverMetric>();
            
            foreach (var product in inventory.GroupBy(il => il.Product))
            {
                var productMovements = movements.Where(m => m.ProductId == product.Key.Id).ToList();
                var soldQuantity = productMovements
                    .Where(m => m.TransactionType == "Pick" || m.TransactionType == "Sale")
                    .Sum(m => Math.Abs(m.QuantityChange));
                
                var averageStock = product.Sum(p => p.QuantityAvailable);
                var turnoverRate = averageStock > 0 ? (decimal)soldQuantity / averageStock : 0;
                
                // Calculate revenue using product cost since movement doesn't have unit cost
                var revenue = (decimal)soldQuantity * (product.Key.Cost ?? 0);
                
                turnoverMetrics.Add(new TurnoverMetric
                {
                    ProductSku = product.Key.Sku,
                    ProductName = product.Key.Name,
                    TurnoverRate = turnoverRate,
                    Revenue = revenue,
                    UnitsSold = soldQuantity,
                    CurrentStock = averageStock,
                    StockValue = averageStock * (product.Key.Cost ?? 0)
                });
            }
            
            return turnoverMetrics;
        }

        private PerformanceTrend CalculatePerformanceTrends(List<InventoryMovement> current, List<InventoryMovement> previous)
        {
            var currentSales = current.Where(m => m.TransactionType == "Pick" || m.TransactionType == "Sale").Sum(m => Math.Abs(m.QuantityChange));
            var previousSales = previous.Where(m => m.TransactionType == "Pick" || m.TransactionType == "Sale").Sum(m => Math.Abs(m.QuantityChange));
            var salesGrowth = previousSales > 0 ? ((decimal)(currentSales - previousSales) / previousSales) * 100 : 0;
            
            // Calculate revenue using product cost since movements don't have unit cost
            var currentRevenue = current
                .Where(m => m.TransactionType == "Pick" || m.TransactionType == "Sale")
                .Sum(m => Math.Abs(m.QuantityChange) * (m.Product.Cost ?? 0));
            var previousRevenue = previous
                .Where(m => m.TransactionType == "Pick" || m.TransactionType == "Sale")
                .Sum(m => Math.Abs(m.QuantityChange) * (m.Product.Cost ?? 0));
            var revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
            
            return new PerformanceTrend
            {
                SalesGrowth = salesGrowth,
                RevenueGrowth = revenueGrowth,
                MovementGrowth = previous.Count > 0 ? ((decimal)(current.Count - previous.Count) / previous.Count) * 100 : 0,
                ActiveProducts = current.Select(m => m.ProductId).Distinct().Count()
            };
        }

        private List<TopPerformer> GetTopPerformers(List<InventoryMovement> movements, List<InventoryLevel> inventory)
        {
            return movements
                .Where(m => m.TransactionType == "Pick" || m.TransactionType == "Sale")
                .GroupBy(m => new { m.ProductId, m.Product.Sku, m.Product.Name })
                .Select(g => {
                    var unitsSold = g.Sum(m => Math.Abs(m.QuantityChange));
                    var days = 30; // Assuming 30-day period
                    var velocity = days > 0 ? (decimal)unitsSold / days : 0;
                    return new TopPerformer
                    {
                        ProductSku = g.Key.Sku,
                        ProductName = g.Key.Name,
                        Sku = g.Key.Sku, // For frontend compatibility
                        Revenue = g.Sum(m => Math.Abs(m.QuantityChange) * (m.Product.Cost ?? 0)),
                        UnitsSold = unitsSold,
                        Transactions = g.Count(),
                        CurrentStock = inventory.Where(il => il.ProductId == g.Key.ProductId).Sum(il => il.QuantityOnHand),
                        Velocity = velocity
                    };
                })
                .OrderByDescending(p => p.Revenue)
                .Take(10)
                .ToList();
        }

        private List<UnderPerformer> GetUnderPerformers(List<InventoryLevel> inventory, List<InventoryMovement> movements)
        {
            var productsWithSales = movements.Where(m => m.TransactionType == "Pick" || m.TransactionType == "Sale").Select(m => m.ProductId).Distinct().ToHashSet();
            
            return inventory
                .Where(il => !productsWithSales.Contains(il.ProductId) && il.QuantityOnHand > 0)
                .GroupBy(il => il.Product)
                .Select(g => {
                    var currentStock = g.Sum(il => il.QuantityOnHand);
                    return new UnderPerformer
                    {
                        ProductSku = g.Key.Sku,
                        ProductName = g.Key.Name,
                        Sku = g.Key.Sku, // For frontend compatibility
                        StockQuantity = currentStock,
                        CurrentStock = currentStock, // For frontend compatibility
                        StockValue = currentStock * (g.Key.Cost ?? 0),
                        DaysInStock = 30, // Since no sales in the period
                        DaysOnHand = 999, // High number for no sales
                        LastSaleDate = null, // No sales in the current period
                        Velocity = 0 // No velocity since no sales
                    };
                })
                .OrderByDescending(u => u.StockValue)
                .Take(10)
                .ToList();
        }

        private decimal CalculateRevenueGrowth(List<InventoryMovement> current, List<InventoryMovement> previous)
        {
            var currentRevenue = current
                .Where(m => m.TransactionType == "Pick" || m.TransactionType == "Sale")
                .Sum(m => Math.Abs(m.QuantityChange) * (m.Product.Cost ?? 0));
            var previousRevenue = previous
                .Where(m => m.TransactionType == "Pick" || m.TransactionType == "Sale")
                .Sum(m => Math.Abs(m.QuantityChange) * (m.Product.Cost ?? 0));
            
            return previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
        }
    }

    // Model classes for locations report
    public class LocationAnalytic
    {
        public int LocationId { get; set; }
        public string LocationCode { get; set; } = string.Empty;
        public string LocationName { get; set; } = string.Empty;
        public string Warehouse { get; set; } = string.Empty;
        public int TotalSkus { get; set; }
        public int TotalQuantity { get; set; }
        public decimal TotalCostValue { get; set; }
        public decimal TotalRetailValue { get; set; }
        public decimal AverageQuantityPerSku { get; set; }
        public int LowStockItems { get; set; }
        public decimal UtilizationScore { get; set; }
    }

    public class WarehouseSummary
    {
        public string WarehouseName { get; set; } = string.Empty;
        public int LocationCount { get; set; }
        public int TotalSkus { get; set; }
        public int TotalQuantity { get; set; }
        public decimal TotalCostValue { get; set; }
        public decimal TotalRetailValue { get; set; }
        public decimal AverageUtilization { get; set; }
    }

    public class LocationReportSummary
    {
        public int TotalLocations { get; set; }
        public int TotalWarehouses { get; set; }
        public int TotalSkus { get; set; }
        public int TotalQuantity { get; set; }
        public decimal TotalCostValue { get; set; }
        public decimal TotalRetailValue { get; set; }
        public decimal AverageUtilization { get; set; }
        public string TopLocation { get; set; } = string.Empty;
        public int LowStockLocations { get; set; }
    }

    public class VelocityMetric
    {
        public string ProductSku { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public int CurrentStock { get; set; }
        public decimal Velocity { get; set; } // Units per day
        public decimal DaysOfStock { get; set; }
        public int TotalMovements { get; set; }
    }

    public class TurnoverMetric
    {
        public string ProductSku { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public decimal TurnoverRate { get; set; }
        public decimal Revenue { get; set; }
        public int UnitsSold { get; set; }
        public int CurrentStock { get; set; }
        public decimal StockValue { get; set; }
    }

    public class PerformanceTrend
    {
        public decimal SalesGrowth { get; set; }
        public decimal RevenueGrowth { get; set; }
        public decimal MovementGrowth { get; set; }
        public int ActiveProducts { get; set; }
    }

    public class TopPerformer
    {
        public string ProductSku { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty; // Frontend expects this
        public decimal Revenue { get; set; }
        public int UnitsSold { get; set; }
        public int Transactions { get; set; }
        public int CurrentStock { get; set; }
        public decimal? Velocity { get; set; }
    }

    public class UnderPerformer
    {
        public string ProductSku { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty; // Frontend expects this
        public int StockQuantity { get; set; }
        public int CurrentStock { get; set; } // Frontend expects this
        public decimal StockValue { get; set; }
        public int DaysInStock { get; set; }
        public int? DaysOnHand { get; set; } // Frontend expects this
        public DateTime? LastSaleDate { get; set; }
        public decimal? Velocity { get; set; }
    }

    public class PerformanceReportSummary
    {
        public int TotalProducts { get; set; }
        public int TotalMovements { get; set; }
        public decimal AverageVelocity { get; set; }
        public decimal AverageTurnover { get; set; }
        public int FastMovers { get; set; }
        public int SlowMovers { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal RevenueGrowth { get; set; }
        public int UnitsSold { get; set; }
        public double UnitsSoldGrowth { get; set; }
        public double AverageStockCoverage { get; set; }
        public int ActiveSKUs { get; set; }
        public int ZeroStockSKUs { get; set; }
        public int TotalTransactions { get; set; }
    }
}