using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Infrastructure.Services;

namespace SkuVaultSaaS.Infrastructure.HostedServices
{
    public class LowStockNotificationHostedService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<LowStockNotificationHostedService> _logger;
        private readonly LowStockNotificationSettings _settings;

        public LowStockNotificationHostedService(
            IServiceProvider serviceProvider,
            ILogger<LowStockNotificationHostedService> logger,
            IOptions<LowStockNotificationSettings> settings)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _settings = settings.Value;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Low Stock Notification Service started - Interval: {Interval} minutes", 
                _settings.CheckIntervalMinutes);

            // Initial delay before first check
            await Task.Delay(TimeSpan.FromMinutes(_settings.StartupDelayMinutes), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CheckAndSendLowStockNotifications();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during low stock notification check");
                }

                // Wait for the configured interval before next check
                await Task.Delay(TimeSpan.FromMinutes(_settings.CheckIntervalMinutes), stoppingToken);
            }
        }

        private async Task CheckAndSendLowStockNotifications()
        {
            _logger.LogInformation("Starting low stock notification check");

            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

            try
            {
                // Get all customers that have email notifications enabled
                var customers = await context.Customers
                    .Where(c => !string.IsNullOrEmpty(c.Email))
                    .ToListAsync();

                foreach (var customer in customers)
                {
                    try
                    {
                        var lowStockItems = await GetLowStockItemsForCustomer(context, customer.Id);
                        
                        if (lowStockItems.Any())
                        {
                            _logger.LogInformation("Found {Count} low stock items for customer {CustomerName} ({Email})", 
                                lowStockItems.Count, customer.Name, customer.Email);

                            var emailItems = lowStockItems.Select(item => new LowStockEmailItem
                            {
                                ProductSku = item.ProductSku,
                                ProductName = item.ProductName,
                                LocationName = item.LocationName,
                                CurrentQuantity = item.CurrentQuantity,
                                ThresholdQuantity = item.ThresholdQuantity
                            }).ToList();

                            await emailService.SendLowStockNotificationAsync(
                                customer.Email!, 
                                customer.Name, 
                                emailItems);

                            _logger.LogInformation("Low stock notification sent to {Email} for {Count} items", 
                                customer.Email, lowStockItems.Count);
                        }
                        else
                        {
                            _logger.LogDebug("No low stock items found for customer {CustomerName}", customer.Name);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing low stock notifications for customer {CustomerName} ({Email})", 
                            customer.Name, customer.Email);
                    }
                }

                _logger.LogInformation("Low stock notification check completed for {CustomerCount} customers", customers.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during low stock notification check");
                throw;
            }
        }

        private async Task<List<LowStockItemSummary>> GetLowStockItemsForCustomer(ApplicationDbContext context, int customerId)
        {
            var lowStockItems = new List<LowStockItemSummary>();

            // Get all inventory levels for the customer
            var inventoryLevels = await context.InventoryLevels
                .Include(il => il.Product)
                .Include(il => il.Location)
                .Where(il => il.CustomerId == customerId)
                .ToListAsync();

            foreach (var inventoryLevel in inventoryLevels)
            {
                // Check for specific threshold for this product and location
                var specificThreshold = await context.LowStockThresholds
                    .Where(lst => lst.CustomerId == customerId 
                        && lst.ProductId == inventoryLevel.ProductId 
                        && lst.LocationId == inventoryLevel.LocationId 
                        && lst.IsActive)
                    .FirstOrDefaultAsync();

                var thresholdQuantity = specificThreshold?.ThresholdQuantity ?? _settings.DefaultThresholdQuantity;
                
                if (inventoryLevel.QuantityAvailable <= thresholdQuantity)
                {
                    lowStockItems.Add(new LowStockItemSummary
                    {
                        ProductSku = inventoryLevel.Product.Sku,
                        ProductName = inventoryLevel.Product.Name,
                        LocationName = inventoryLevel.Location.Name ?? inventoryLevel.Location.Code,
                        CurrentQuantity = inventoryLevel.QuantityAvailable,
                        ThresholdQuantity = thresholdQuantity
                    });
                }
            }

            return lowStockItems.OrderBy(x => x.ProductSku).ThenBy(x => x.LocationName).ToList();
        }
    }

    // Configuration class for low stock notification settings
    public class LowStockNotificationSettings
    {
        public bool IsEnabled { get; set; } = true;
        public int CheckIntervalMinutes { get; set; } = 60; // Check every hour by default
        public int StartupDelayMinutes { get; set; } = 5; // Wait 5 minutes after startup
        public int DefaultThresholdQuantity { get; set; } = 10;
    }

    // Summary class for low stock items
    public class LowStockItemSummary
    {
        public string ProductSku { get; set; } = "";
        public string ProductName { get; set; } = "";
        public string LocationName { get; set; } = "";
        public int CurrentQuantity { get; set; }
        public int ThresholdQuantity { get; set; }
    }
}