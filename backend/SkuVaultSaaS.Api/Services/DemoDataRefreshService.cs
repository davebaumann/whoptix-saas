using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Infrastructure.Services;
using SkuVaultSaaS.Core.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SkuVaultSaaS.Api.Services
{
    public class DemoDataRefreshService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IDemoConnectionService _demoConnectionService;
        private readonly ILogger<DemoDataRefreshService> _logger;
        private Timer? _timer;

        public DemoDataRefreshService(IServiceProvider serviceProvider, IDemoConnectionService demoConnectionService, ILogger<DemoDataRefreshService> logger)
        {
            _serviceProvider = serviceProvider;
            _demoConnectionService = demoConnectionService;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("========== DemoDataRefreshService.ExecuteAsync() CALLED ==========");
            _logger.LogInformation("DemoDataRefreshService starting");

            // Run immediately on startup to populate demo data
            _logger.LogInformation("About to call RefreshDemoDataAsync()");
            await RefreshDemoDataAsync();
            _logger.LogInformation("RefreshDemoDataAsync() completed");

            // Then schedule to run at 6 AM Eastern Time daily
            var nextRun = GetNextRunTime();
            _timer = new Timer(async _ => await RefreshDemoDataAsync(), null, nextRun, TimeSpan.FromHours(24));

            await Task.CompletedTask;
        }

        private TimeSpan GetNextRunTime()
        {
            var now = DateTime.UtcNow;
            TimeZoneInfo easternZone;
            try
            {
                // Try Windows timezone name first (for development)
                easternZone = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");
            }
            catch
            {
                // Fallback to IANA timezone name for Linux containers
                easternZone = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");
            }
            var easternNow = TimeZoneInfo.ConvertTime(now, easternZone);

            // Target time: 6 AM ET
            var targetTime = easternNow.Date.AddHours(6);

            // If 6 AM has already passed today, schedule for tomorrow
            if (easternNow > targetTime)
            {
                targetTime = targetTime.AddDays(1);
            }

            var delay = targetTime - easternNow;
            _logger.LogInformation("DemoDataRefreshService scheduled to run at {TargetTime} ET (in {Hours} hours, {Minutes} minutes)", 
                targetTime, delay.Hours, delay.Minutes);

            return delay;
        }

        private async Task RefreshDemoDataAsync()
        {
            try
            {
                _logger.LogInformation("Starting demo data refresh for customer 2");

                // Create a separate DbContext for the demo database
                var demoConnectionString = _demoConnectionService.GetConnectionString(null);
                var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
                optionsBuilder.UseMySql(demoConnectionString, ServerVersion.AutoDetect(demoConnectionString), mySqlOptions =>
                {
                    mySqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null);
                });

                using var demoContext = new ApplicationDbContext(optionsBuilder.Options);

                // Ensure demo products exist
                await EnsureDemoProductsExist(demoContext);

                TimeZoneInfo easternZone;
                try
                {
                    // Try Windows timezone name first (for development)
                    easternZone = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");
                }
                catch
                {
                    // Fallback to IANA timezone name for Linux containers
                    easternZone = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");
                }
                var easternNow = TimeZoneInfo.ConvertTime(DateTime.UtcNow, easternZone);
                
                bool isWeeklyPurge = easternNow.DayOfWeek == DayOfWeek.Sunday;

                // Weekly purge: Delete sales older than 30 days
                if (isWeeklyPurge)
                {
                    var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
                    var deletedCount = await demoContext.Database.ExecuteSqlInterpolatedAsync(
                        $"DELETE FROM Sales WHERE CustomerId = 2 AND SaleDate < {thirtyDaysAgo}");

                    if (deletedCount > 0)
                    {
                        _logger.LogInformation("Weekly purge: Deleted {Count} sales records older than 30 days", deletedCount);
                    }
                }

                // Daily: Add new sales transactions (batch insert via SQL for performance)
                var newSales = GenerateDemoSalesData(50, 100); // 50-100 sales per day
                if (newSales.Any())
                {
                    await InsertSalesBatchAsync(demoContext, newSales);
                    _logger.LogInformation("Successfully added {Count} new sales records for customer 2", newSales.Count);
                }

                // Daily: Add new picker transactions for picker analytics dashboard
                var newPickerTransactions = GenerateDemoPickerTransactions(50, 100); // 50-100 pick transactions per day
                if (newPickerTransactions.Any())
                {
                    await InsertTransactionsBatchAsync(demoContext, newPickerTransactions);
                    _logger.LogInformation("Successfully added {Count} new picker transactions for customer 2", newPickerTransactions.Count);
                }

                // Reschedule for next 6 AM ET
                var nextRun = GetNextRunTime();
                _timer?.Change(nextRun, TimeSpan.FromHours(24));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing demo data");
            }
        }

        private async Task EnsureDemoProductsExist(ApplicationDbContext demoContext)
        {
            try
            {
                // Check if demo products already exist
                var existingProducts = await demoContext.Products.Where(p => p.CustomerId == 2).CountAsync();
                
                if (existingProducts < 5)
                {
                    _logger.LogInformation("Creating demo products for customer 2");
                    
                    var demoProducts = new List<Product>
                    {
                        new Product { CustomerId = 2, Sku = "DEMO-001", Name = "Demo Product 1", Cost = 25.00m, Price = 79.99m, CreatedAtUtc = DateTime.UtcNow },
                        new Product { CustomerId = 2, Sku = "DEMO-002", Name = "Demo Product 2", Cost = 45.00m, Price = 149.99m, CreatedAtUtc = DateTime.UtcNow },
                        new Product { CustomerId = 2, Sku = "DEMO-003", Name = "Demo Product 3", Cost = 75.00m, Price = 249.99m, CreatedAtUtc = DateTime.UtcNow },
                        new Product { CustomerId = 2, Sku = "DEMO-004", Name = "Demo Product 4", Cost = 120.00m, Price = 399.99m, CreatedAtUtc = DateTime.UtcNow },
                        new Product { CustomerId = 2, Sku = "DEMO-005", Name = "Demo Product 5", Cost = 180.00m, Price = 599.99m, CreatedAtUtc = DateTime.UtcNow }
                    };

                    demoContext.Products.AddRange(demoProducts);
                    await demoContext.SaveChangesAsync();
                    _logger.LogInformation("Demo products created successfully");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error ensuring demo products exist");
            }
        }

        private async Task InsertSalesBatchAsync(ApplicationDbContext context, List<Sale> sales)
        {
            // Use AddRange + SaveChangesAsync for simpler, more reliable batch insert
            try
            {
                context.Sales.AddRange(sales);
                await context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during batch insert of demo sales data. Count: {Count}", sales.Count);
                throw;
            }
        }

        private List<Sale> GenerateDemoSalesData(int minSales = 30, int maxSales = 60)
        {
            var sales = new List<Sale>();
            var random = new Random();
            var now = DateTime.UtcNow;

            var channels = new[] { "Web", "Amazon", "Shopify", "eBay", "Bulk" };
            var products = new[] { "PROD-001", "PROD-002", "PROD-003", "PROD-004" };
            var prices = new Dictionary<string, decimal>
            {
                { "PROD-001", 299m },
                { "PROD-002", 499m },
                { "PROD-003", 799m },
                { "PROD-004", 1199m }
            };

            // Generate specified number of sales for today/yesterday only
            // Since this runs daily, we only need today's data (90%) + yesterday's (10%)
            var saleCount = random.Next(minSales, maxSales + 1);

            for (int i = 0; i < saleCount; i++)
            {
                // Weight distribution: 90% today, 10% yesterday
                int daysAgo = random.NextDouble() < 0.90 ? 0 : 1;
                var saleDate = now.AddDays(-daysAgo).AddHours(random.Next(0, 24)).AddMinutes(random.Next(0, 60));

                var sku = products[random.Next(products.Length)];
                var quantity = random.Next(1, 8);
                var price = prices[sku];

                var sale = new Sale
                {
                    CustomerId = 2,
                    SaleId = $"DEMO-{DateTime.UtcNow.Ticks}-{i}",
                    Sku = sku,
                    Quantity = quantity,
                    SaleDate = saleDate,
                    Channel = channels[random.Next(channels.Length)],
                    OrderNumber = $"ORD-{saleDate:yyyyMMdd}-{i:D3}",
                    Price = price,
                    CustomerName = $"Demo Customer {random.Next(1, 100)}",
                    CustomerEmail = $"customer{random.Next(1, 100)}@example.com"
                };

                sales.Add(sale);
            }

            return sales;
        }

        private string GetProductName(string sku)
        {
            return sku switch
            {
                "PROD-001" => "Premium Widget Pro",
                "PROD-002" => "Deluxe Widget Plus",
                "PROD-003" => "Professional Widget System",
                "PROD-004" => "Enterprise Widget Suite",
                _ => "Widget"
            };
        }

        private async Task InsertTransactionsBatchAsync(ApplicationDbContext context, List<Transaction> transactions)
        {
            try
            {
                context.Transactions.AddRange(transactions);
                await context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during batch insert of demo picker transactions. Count: {Count}", transactions.Count);
                throw;
            }
        }

        private List<Transaction> GenerateDemoPickerTransactions(int minTransactions = 50, int maxTransactions = 100)
        {
            var transactions = new List<Transaction>();
            var random = new Random();
            var now = DateTime.UtcNow;

            var pickers = new[] { "John Smith", "Jane Doe", "Mike Wilson", "Sarah Johnson", "Tom Brown" };
            var products = new[] { "PROD-001", "PROD-002", "PROD-003", "PROD-004" };
            var reasons = new[] { "Order Pick", "Warehouse Recount", "Inventory Correction", "Quality Check" };

            // Generate specified number of transactions for today/yesterday only
            // Since this runs daily, we only need today's data (90%) + yesterday's (10%)
            var transactionCount = random.Next(minTransactions, maxTransactions + 1);

            for (int i = 0; i < transactionCount; i++)
            {
                // Weight distribution: 90% today, 10% yesterday
                int daysAgo = random.NextDouble() < 0.90 ? 0 : 1;

                var transactionDate = now.AddDays(-daysAgo).AddHours(random.Next(6, 22)).AddMinutes(random.Next(0, 60)); // Business hours

                var sku = products[random.Next(products.Length)];
                var quantity = random.Next(1, 5);

                var transaction = new Transaction
                {
                    CustomerId = 2,
                    SkuVaultId = $"DEMO-PICK-{DateTime.UtcNow.Ticks}-{i}",
                    Sku = sku,
                    Code = sku,
                    Title = GetProductName(sku),
                    Quantity = quantity,
                    QuantityBefore = random.Next(10, 100),
                    QuantityAfter = random.Next(10, 100),
                    TransactionType = "Pick",
                    TransactionReason = reasons[random.Next(reasons.Length)],
                    TransactionNote = $"Demo pick transaction {i}",
                    ContextType = "Order",
                    ContextId = $"ORD-{transactionDate:yyyyMMdd}-{i:D3}",
                    User = pickers[random.Next(pickers.Length)],
                    PerformedBy = pickers[random.Next(pickers.Length)],
                    TransactionDate = transactionDate,
                    SyncedAtUtc = now,
                    CreatedAtUtc = now
                };

                transactions.Add(transaction);
            }

            return transactions;
        }

        // DECOMMISSIONED: InsertInventoryMovementsBatchAsync and GenerateDemoInventoryMovements removed with InventoryMovements table decommission

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("DemoDataRefreshService stopping");
            _timer?.Dispose();
            await base.StopAsync(cancellationToken);
        }

        public override void Dispose()
        {
            _timer?.Dispose();
            base.Dispose();
        }
    }
}
