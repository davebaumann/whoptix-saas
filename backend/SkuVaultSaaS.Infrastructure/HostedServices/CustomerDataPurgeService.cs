using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SkuVaultSaaS.Infrastructure.Data;

namespace SkuVaultSaaS.Infrastructure.HostedServices
{
    public class CustomerDataPurgeService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<CustomerDataPurgeService> _logger;
        private readonly TimeSpan _purgeInterval = TimeSpan.FromDays(1); // Run daily
        private readonly TimeSpan _retentionPeriod = TimeSpan.FromDays(90); // 90 days retention

        public CustomerDataPurgeService(
            IServiceProvider serviceProvider,
            ILogger<CustomerDataPurgeService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessCustomerPurge();
                    await Task.Delay(_purgeInterval, stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during customer data purge process");
                    await Task.Delay(TimeSpan.FromHours(1), stoppingToken); // Wait 1 hour on error
                }
            }
        }

        private async Task ProcessCustomerPurge()
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var cutoffDate = DateTime.UtcNow.Subtract(_retentionPeriod);

            // Find customers cancelled more than 90 days ago
            var customersToDelete = await context.Customers
                .Where(c => !c.IsActive && 
                           c.CancelledAt.HasValue && 
                           c.CancelledAt.Value <= cutoffDate &&
                           !c.ScheduledForDeletion.HasValue)
                .ToListAsync();

            if (customersToDelete.Any())
            {
                _logger.LogInformation("Found {Count} customers eligible for data purge", customersToDelete.Count);

                foreach (var customer in customersToDelete)
                {
                    await PurgeCustomerData(context, customer);
                }

                await context.SaveChangesAsync();
                _logger.LogInformation("Completed purge of {Count} inactive customers", customersToDelete.Count);
            }
        }

        private async Task PurgeCustomerData(ApplicationDbContext context, Core.Models.Customer customer)
        {
            using var transaction = await context.Database.BeginTransactionAsync();
            
            try
            {
                _logger.LogInformation("Purging data for customer {CustomerId} ({CustomerName})", 
                    customer.Id, customer.Name);

                // Delete related data in correct order to avoid foreign key constraints
                var transactions = await context.Transactions
                    .Where(t => t.CustomerId == customer.Id)
                    .ToListAsync();
                context.Transactions.RemoveRange(transactions);

                var inventoryMovements = await context.InventoryMovements
                    .Where(im => im.CustomerId == customer.Id)
                    .ToListAsync();
                context.InventoryMovements.RemoveRange(inventoryMovements);

                var inventoryLevels = await context.InventoryLevels
                    .Where(il => il.CustomerId == customer.Id)
                    .ToListAsync();
                context.InventoryLevels.RemoveRange(inventoryLevels);

                var lowStockThresholds = await context.LowStockThresholds
                    .Where(lst => lst.CustomerId == customer.Id)
                    .ToListAsync();
                context.LowStockThresholds.RemoveRange(lowStockThresholds);

                var sales = await context.Sales
                    .Where(s => s.CustomerId == customer.Id)
                    .ToListAsync();
                context.Sales.RemoveRange(sales);

                var shipments = await context.Shipments
                    .Where(s => s.CustomerId == customer.Id)
                    .ToListAsync();
                context.Shipments.RemoveRange(shipments);

                var products = await context.Products
                    .Where(p => p.CustomerId == customer.Id)
                    .ToListAsync();
                context.Products.RemoveRange(products);

                var locations = await context.Locations
                    .Where(l => l.CustomerId == customer.Id)
                    .ToListAsync();
                context.Locations.RemoveRange(locations);

                var userInvitations = await context.UserInvitations
                    .Where(ui => ui.CustomerId == customer.Id)
                    .ToListAsync();
                context.UserInvitations.RemoveRange(userInvitations);

                // Mark customer as scheduled for deletion instead of immediate deletion
                customer.ScheduledForDeletion = DateTime.UtcNow;

                await transaction.CommitAsync();
                
                _logger.LogInformation("Successfully purged data for customer {CustomerId}", customer.Id);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to purge data for customer {CustomerId}", customer.Id);
                throw;
            }
        }
    }
}