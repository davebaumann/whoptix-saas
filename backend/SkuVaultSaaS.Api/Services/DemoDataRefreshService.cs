using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
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
        private readonly ILogger<DemoDataRefreshService> _logger;
        private Timer? _timer;

        public DemoDataRefreshService(IServiceProvider serviceProvider, ILogger<DemoDataRefreshService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("DemoDataRefreshService starting");

            // Run immediately on startup to populate demo data
            await RefreshDemoDataAsync();

            // Then schedule to run at 6 AM Eastern Time daily
            var nextRun = GetNextRunTime();
            _timer = new Timer(async _ => await RefreshDemoDataAsync(), null, nextRun, TimeSpan.FromHours(24));

            await Task.CompletedTask;
        }

        private TimeSpan GetNextRunTime()
        {
            var now = DateTime.UtcNow;
            var easternZone = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");
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

                using var scope = _serviceProvider.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                var easternZone = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");
                var easternNow = TimeZoneInfo.ConvertTime(DateTime.UtcNow, easternZone);
                
                bool isWeeklyPurge = easternNow.DayOfWeek == DayOfWeek.Sunday;

                // Weekly purge: Delete sales older than 30 days
                if (isWeeklyPurge)
                {
                    var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
                    var deletedCount = await context.Database.ExecuteSqlInterpolatedAsync(
                        $"DELETE FROM Sales WHERE CustomerId = 2 AND SaleDate < {thirtyDaysAgo}");

                    if (deletedCount > 0)
                    {
                        _logger.LogInformation("Weekly purge: Deleted {Count} sales records older than 30 days", deletedCount);
                    }
                }

                // Daily: Add new sales transactions (batch insert via SQL for performance)
                var newSales = GenerateDemoSalesData(500, 1000); // Random 500-1000 sales
                if (newSales.Any())
                {
                    await InsertSalesBatchAsync(context, newSales);
                    _logger.LogInformation("Successfully added {Count} new sales records for customer 2", newSales.Count);
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

        private List<Sale> GenerateDemoSalesData(int minSales = 500, int maxSales = 1000)
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

            // Generate specified number of sales, distributed across last 10 days
            var saleCount = random.Next(minSales, maxSales + 1);

            for (int i = 0; i < saleCount; i++)
            {
                var daysAgo = random.Next(0, 10); // Distribute across last 10 days
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
