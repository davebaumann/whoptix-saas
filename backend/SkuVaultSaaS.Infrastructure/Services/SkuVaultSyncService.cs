using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Infrastructure.SkuVaultSaaSApi;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkuVaultSaaS.Infrastructure.Services
{
    public class SkuVaultSyncService : ISkuVaultSyncService
    {
        private readonly ApplicationDbContext _context;
        private readonly ISkuVaultApiClient _apiClient;
        private readonly ILogger<SkuVaultSyncService> _logger;

        public SkuVaultSyncService(
            ApplicationDbContext context,
            ISkuVaultApiClient apiClient,
            ILogger<SkuVaultSyncService> logger)
        {
            _context = context;
            _apiClient = apiClient;
            _logger = logger;
        }

        public async Task SyncCustomerDataAsync(int customerId)
        {
            _logger.LogInformation("Starting full sync for customer {CustomerId}", customerId);

            try
            {
                await SyncProductsAsync(customerId);
                await SyncLocationsAsync(customerId);
                await SyncInventoryLevelsAsync(customerId);
                await SyncInventoryMovementsAsync(customerId);
                await SyncTransactionsAsync(customerId);

                // Update customer's last synced timestamp
                var customer = await _context.Customers.FindAsync(customerId);
                if (customer != null)
                {
                    customer.LastSyncedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                _logger.LogInformation("Completed full sync for customer {CustomerId}", customerId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing customer {CustomerId}", customerId);
                throw;
            }
        }

        public async Task SyncProductsAsync(int customerId)
        {
            _logger.LogInformation("Syncing products for customer {CustomerId}", customerId);

            var customer = await _context.Customers
                .Include(c => c.Tenant)
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer?.Tenant?.SkuVaultTenantToken == null || string.IsNullOrWhiteSpace(customer.Tenant.SkuVaultUserToken))
            {
                _logger.LogWarning("Customer {CustomerId} is missing SkuVault tokens (tenant or user)", customerId);
                return;
            }

            _logger.LogInformation("Fetching products from SkuVault API for customer {CustomerId}", customerId);
            var apiProducts = await _apiClient.GetProductsAsync(customer.Tenant.SkuVaultTenantToken, customer.Tenant.SkuVaultUserToken);
            _logger.LogInformation("Received {Count} products from SkuVault API for customer {CustomerId}", apiProducts.Count, customerId);
            
            if (apiProducts.Count == 0)
            {
                _logger.LogWarning("No products returned from SkuVault API for customer {CustomerId}", customerId);
                return;
            }

            var productsAdded = 0;
            var productsUpdated = 0;
            
            foreach (var apiProduct in apiProducts)
            {
                _logger.LogDebug("Processing product SKU: {Sku}, Description: {Description}", apiProduct.Sku, apiProduct.Description);
                
                var existingProduct = await _context.Products
                    .FirstOrDefaultAsync(p => p.CustomerId == customerId && p.Sku == apiProduct.Sku);

                if (existingProduct != null)
                {
                    // Update existing product
                    existingProduct.Name = apiProduct.Description;
                    existingProduct.Description = apiProduct.LongDescription;
                    existingProduct.Category = apiProduct.Classification;
                    existingProduct.Cost = apiProduct.Cost;
                    existingProduct.Price = apiProduct.RetailPrice;
                    existingProduct.UpdatedAtUtc = DateTime.UtcNow;
                    productsUpdated++;
                }
                else
                {
                    // Create new product
                    var newProduct = new Product
                    {
                        CustomerId = customerId,
                        Sku = apiProduct.Sku,
                        Name = apiProduct.Description,
                        Description = apiProduct.LongDescription,
                        Category = apiProduct.Classification,
                        Cost = apiProduct.Cost,
                        Price = apiProduct.RetailPrice,
                        CreatedAtUtc = DateTime.UtcNow,
                        UpdatedAtUtc = DateTime.UtcNow
                    };
                    _context.Products.Add(newProduct);
                    productsAdded++;
                    _logger.LogDebug("Added new product: {Sku}", apiProduct.Sku);
                }
            }

            _logger.LogInformation("Saving {Added} new and {Updated} updated products to database", productsAdded, productsUpdated);
            var saved = await _context.SaveChangesAsync();
            _logger.LogInformation("Saved {SavedCount} changes. Synced {Count} products for customer {CustomerId}", saved, apiProducts.Count, customerId);
        }

        public async Task SyncLocationsAsync(int customerId)
        {
            _logger.LogInformation("Syncing locations for customer {CustomerId}", customerId);

            var customer = await _context.Customers
                .Include(c => c.Tenant)
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer?.Tenant?.SkuVaultTenantToken == null || string.IsNullOrWhiteSpace(customer.Tenant.SkuVaultUserToken))
            {
                _logger.LogWarning("Customer {CustomerId} is missing SkuVault tokens (tenant or user)", customerId);
                return;
            }

            var apiLocations = await _apiClient.GetLocationsAsync(customer.Tenant.SkuVaultTenantToken, customer.Tenant.SkuVaultUserToken);

            foreach (var apiLocation in apiLocations)
            {
                var existingLocation = await _context.Locations
                    .FirstOrDefaultAsync(l => l.CustomerId == customerId && l.Code == apiLocation.LocationCode);

                if (existingLocation != null)
                {
                    // Update existing location
                    existingLocation.Name = apiLocation.LocationName;
                    existingLocation.Warehouse = apiLocation.WarehouseName;
                    existingLocation.IsActive = apiLocation.IsActive;
                    existingLocation.UpdatedAtUtc = DateTime.UtcNow;
                }
                else
                {
                    // Create new location
                    var newLocation = new Location
                    {
                        CustomerId = customerId,
                        Code = apiLocation.LocationCode,
                        Name = apiLocation.LocationName,
                        Warehouse = apiLocation.WarehouseName,
                        IsActive = apiLocation.IsActive,
                        CreatedAtUtc = DateTime.UtcNow,
                        UpdatedAtUtc = DateTime.UtcNow
                    };
                    _context.Locations.Add(newLocation);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Synced {Count} locations for customer {CustomerId}", apiLocations.Count, customerId);
        }

        public async Task SyncInventoryLevelsAsync(int customerId)
        {
            _logger.LogInformation("Syncing inventory levels for customer {CustomerId}", customerId);

            var customer = await _context.Customers
                .Include(c => c.Tenant)
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer?.Tenant?.SkuVaultTenantToken == null || string.IsNullOrWhiteSpace(customer.Tenant.SkuVaultUserToken))
            {
                _logger.LogWarning("Customer {CustomerId} is missing SkuVault tokens (tenant or user)", customerId);
                return;
            }

            var apiInventory = await _apiClient.GetInventoryAsync(customer.Tenant.SkuVaultTenantToken, customer.Tenant.SkuVaultUserToken);

            // Load all products and locations for this customer to map SKU/LocationCode to IDs
            var products = await _context.Products
                .Where(p => p.CustomerId == customerId)
                .ToDictionaryAsync(p => p.Sku, p => p.Id);

            var locations = await _context.Locations
                .Where(l => l.CustomerId == customerId)
                .ToDictionaryAsync(l => l.Code, l => l.Id);

            foreach (var apiItem in apiInventory)
            {
                if (!products.TryGetValue(apiItem.Sku, out var productId))
                {
                    _logger.LogWarning("Product SKU {Sku} not found for customer {CustomerId}", apiItem.Sku, customerId);
                    continue;
                }

                if (!locations.TryGetValue(apiItem.LocationCode, out var locationId))
                {
                    _logger.LogWarning("Location {LocationCode} not found for customer {CustomerId} - skipping inventory record", apiItem.LocationCode, customerId);
                    continue;
                }

                var existingLevel = await _context.InventoryLevels
                    .FirstOrDefaultAsync(i => i.CustomerId == customerId 
                                           && i.ProductId == productId 
                                           && i.LocationId == locationId);

                if (existingLevel != null)
                {
                    // Update existing inventory level
                    existingLevel.QuantityOnHand = apiItem.QuantityOnHand;
                    existingLevel.QuantityAvailable = apiItem.QuantityAvailable;
                    existingLevel.QuantityAllocated = apiItem.QuantityAllocated;
                    existingLevel.UpdatedAtUtc = DateTime.UtcNow;
                }
                else
                {
                    // Create new inventory level
                    var newLevel = new InventoryLevel
                    {
                        CustomerId = customerId,
                        ProductId = productId,
                        LocationId = locationId,
                        QuantityOnHand = apiItem.QuantityOnHand,
                        QuantityAvailable = apiItem.QuantityAvailable,
                        QuantityAllocated = apiItem.QuantityAllocated,
                        UpdatedAtUtc = DateTime.UtcNow
                    };
                    _context.InventoryLevels.Add(newLevel);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Synced {Count} inventory levels for customer {CustomerId}", apiInventory.Count, customerId);
        }

        public async Task SyncInventoryMovementsAsync(int customerId, DateTime? since = null)
        {
            _logger.LogInformation("Syncing inventory movements for customer {CustomerId} since {Since}", customerId, since);

            var customer = await _context.Customers
                .Include(c => c.Tenant)
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer?.Tenant?.SkuVaultTenantToken == null || string.IsNullOrWhiteSpace(customer.Tenant.SkuVaultUserToken))
            {
                _logger.LogWarning("Customer {CustomerId} is missing SkuVault tokens (tenant or user)", customerId);
                return;
            }

            // If no since date provided, use last sync time or default to last 7 days
            DateTime fromDate;
            if (since == null)
            {
                // Customer.LastSyncedAt is non-nullable; if it's default(DateTime) treat as seven days ago.
                fromDate = customer.LastSyncedAt == default ? DateTime.UtcNow.AddDays(-7) : customer.LastSyncedAt;
            }
            else
            {
                fromDate = since.Value;
            }
            
            // ToDate is now (current time)
            var toDate = DateTime.UtcNow;

            var apiMovements = await _apiClient.GetInventoryMovementsAsync(
                customer.Tenant.SkuVaultTenantToken, 
                customer.Tenant.SkuVaultUserToken, 
                fromDate, 
                toDate);

            // Load all products and locations for this customer
            var products = await _context.Products
                .Where(p => p.CustomerId == customerId)
                .ToDictionaryAsync(p => p.Sku, p => p.Id);

            var locations = await _context.Locations
                .Where(l => l.CustomerId == customerId)
                .ToDictionaryAsync(l => l.Code, l => l.Id);

            foreach (var apiMovement in apiMovements)
            {
                if (!products.TryGetValue(apiMovement.Sku, out var productId))
                {
                    _logger.LogWarning("Product SKU {Sku} not found for customer {CustomerId}", apiMovement.Sku, customerId);
                    continue;
                }

                int? locationId = null;
                // SkuVault Location format is "WAREHOUSE--CODE", extract just the CODE part
                if (!string.IsNullOrEmpty(apiMovement.Location))
                {
                    var locationCode = apiMovement.Location.Contains("--") 
                        ? apiMovement.Location.Split("--").Last() 
                        : apiMovement.Location;
                    
                    if (locations.TryGetValue(locationCode, out var locId))
                    {
                        locationId = locId;
                    }
                    else
                    {
                        _logger.LogWarning("Location {LocationCode} not found for customer {CustomerId} in inventory movements - setting location to null", locationCode, customerId);
                        locationId = null;
                    }
                }

                // Check if movement already exists based on SKU, date, user, and quantity to avoid duplicates
                var existingMovement = await _context.InventoryMovements
                    .FirstOrDefaultAsync(m => m.CustomerId == customerId 
                                           && m.ProductId == productId 
                                           && m.PerformedBy == apiMovement.User
                                           && m.OccurredAtUtc == apiMovement.TransactionDate
                                           && m.QuantityChange == apiMovement.Quantity);

                if (existingMovement == null)
                {
                    // Create new movement record
                    var newMovement = new InventoryMovement
                    {
                        CustomerId = customerId,
                        ProductId = productId,
                        LocationId = locationId,
                        QuantityChange = apiMovement.Quantity,
                        Reason = apiMovement.TransactionReason,
                        Reference = apiMovement.TransactionNote, // Use note as reference since no explicit transaction ID
                        PerformedBy = apiMovement.User,
                        TransactionType = apiMovement.TransactionType,
                        Context = apiMovement.Context,
                        OccurredAtUtc = apiMovement.TransactionDate,
                        CreatedAtUtc = DateTime.UtcNow
                    };
                    _context.InventoryMovements.Add(newMovement);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Synced {Count} inventory movements for customer {CustomerId}", apiMovements.Count, customerId);
        }

        public async Task SyncAllCustomersAsync()
        {
            _logger.LogInformation("Starting sync for all customers");

            var customers = await _context.Customers
                .Include(c => c.Tenant)
                .Where(c => c.Tenant != null && c.Tenant.SkuVaultTenantToken != null)
                .ToListAsync();

            foreach (var customer in customers)
            {
                try
                {
                    await SyncCustomerDataAsync(customer.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to sync customer {CustomerId}", customer.Id);
                    // Continue with next customer
                }
            }

            _logger.LogInformation("Completed sync for all customers");
        }

        public async Task SyncTransactionsAsync(int customerId, DateTime? since = null)
        {
            _logger.LogInformation("Syncing transactions for customer {CustomerId} since {Since}", customerId, since);

            var customer = await _context.Customers
                .Include(c => c.Tenant)
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer?.Tenant == null)
            {
                throw new InvalidOperationException($"Customer {customerId} not found or has no tenant");
            }

            if (string.IsNullOrEmpty(customer.Tenant.SkuVaultTenantToken) || string.IsNullOrEmpty(customer.Tenant.SkuVaultUserToken))
            {
                throw new InvalidOperationException($"SkuVault tokens not configured for customer {customerId}");
            }

            // Default to last 7 days if no since date provided
            var fromDate = since ?? DateTime.UtcNow.AddDays(-7);
            var toDate = DateTime.UtcNow;

            // Get transactions from SkuVault API
            var apiTransactions = await _apiClient.GetInventoryMovementsAsync(
                customer.Tenant.SkuVaultTenantToken,
                customer.Tenant.SkuVaultUserToken,
                fromDate,
                toDate);

            _logger.LogInformation("Retrieved {Count} transactions from SkuVault API for customer {CustomerId}", apiTransactions.Count, customerId);

            // Load all products and locations for this customer
            var products = await _context.Products
                .Where(p => p.CustomerId == customerId)
                .ToDictionaryAsync(p => p.Sku, p => p.Id);

            var locations = await _context.Locations
                .Where(l => l.CustomerId == customerId)
                .ToDictionaryAsync(l => l.Code, l => l.Id);

            var syncedCount = 0;
            var now = DateTime.UtcNow;

            foreach (var apiTransaction in apiTransactions)
            {
                try
                {
                    // Check if we have the product
                    if (!products.TryGetValue(apiTransaction.Sku, out var productId))
                    {
                        _logger.LogWarning("Product SKU {Sku} not found for customer {CustomerId}, skipping transaction", apiTransaction.Sku, customerId);
                        continue;
                    }

                    // Create a unique identifier for this transaction
                    var skuVaultId = $"{apiTransaction.Sku}_{apiTransaction.TransactionDate:yyyyMMddHHmmss}_{apiTransaction.User}_{apiTransaction.Context ?? "unknown"}_{apiTransaction.Quantity}";

                    // Check if transaction already exists
                    var existingTransaction = await _context.Transactions
                        .FirstOrDefaultAsync(t => t.SkuVaultId == skuVaultId && t.CustomerId == customerId);

                    if (existingTransaction != null)
                    {
                        _logger.LogDebug("Transaction {SkuVaultId} already exists, skipping", skuVaultId);
                        continue;
                    }

                    // Find location if specified
                    int? locationId = null;
                    if (!string.IsNullOrEmpty(apiTransaction.Location))
                    {
                        var locationCode = apiTransaction.Location.Contains("--") 
                            ? apiTransaction.Location.Split("--").Last() 
                            : apiTransaction.Location;
                        
                        if (locations.TryGetValue(locationCode, out var locId))
                        {
                            locationId = locId;
                        }
                    }

                    // Create new transaction
                    var newTransaction = new Transaction
                    {
                        CustomerId = customerId,
                        SkuVaultId = skuVaultId,
                        ProductId = productId,
                        LocationId = locationId,
                        Sku = apiTransaction.Sku,
                        Quantity = apiTransaction.Quantity,
                        QuantityBefore = apiTransaction.QuantityBefore,
                        QuantityAfter = apiTransaction.QuantityAfter,
                        TransactionType = apiTransaction.TransactionType,
                        TransactionReason = apiTransaction.TransactionReason,
                        TransactionNote = apiTransaction.TransactionNote,
                        Context = apiTransaction.Context,
                        User = apiTransaction.User,
                        PerformedBy = ExtractNameFromUser(apiTransaction.User),
                        TransactionDate = apiTransaction.TransactionDate,
                        SyncedAtUtc = now,
                        CreatedAtUtc = now
                    };

                    _context.Transactions.Add(newTransaction);
                    syncedCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to process transaction for SKU {Sku} at {Date}", apiTransaction.Sku, apiTransaction.TransactionDate);
                }
            }

            if (syncedCount > 0)
            {
                await _context.SaveChangesAsync();
            }

            _logger.LogInformation("Synced {Count} transactions for customer {CustomerId}", syncedCount, customerId);
        }

        private static string ExtractNameFromUser(string? user)
        {
            if (string.IsNullOrWhiteSpace(user))
                return "Unknown";

            if (user.Contains('@'))
            {
                // Extract name from email
                var namePart = user.Split('@')[0];
                return namePart.Replace('.', ' ').Replace('_', ' ')
                    .Split(' ')
                    .Select(part => char.ToUpperInvariant(part[0]) + part.Substring(1).ToLowerInvariant())
                    .Aggregate((a, b) => $"{a} {b}");
            }

            return user;
        }
    }
}
