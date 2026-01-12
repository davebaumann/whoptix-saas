using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SkuVaultSaaS.Core.Enums;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Core.Services;
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
        private readonly IEncryptionService _encryptionService;
        private readonly IConfiguration _configuration;

        public SkuVaultSyncService(
            ApplicationDbContext context,
            ISkuVaultApiClient apiClient,
            ILogger<SkuVaultSyncService> logger,
            IEncryptionService encryptionService,
            IConfiguration configuration)
        {
            _context = context;
            _apiClient = apiClient;
            _logger = logger;
            _encryptionService = encryptionService;
            _configuration = configuration;
        }

        /// <summary>
        /// Decrypts a token from the database. Handles cases where token is already decrypted or null.
        /// </summary>
        private string? DecryptToken(string? encryptedToken)
        {
            if (string.IsNullOrEmpty(encryptedToken))
                return encryptedToken;

            try
            {
                return _encryptionService.Decrypt(encryptedToken);
            }
            catch
            {
                // If decryption fails, assume it's already decrypted (shouldn't happen in normal flow)
                return encryptedToken;
            }
        }

        /// <summary>
        /// Gets the historical data range (in days) based on the customer's membership tier.
        /// Used for initial syncs to retrieve historical transaction data.
        /// </summary>
        private int GetHistoricalDataRangeDays(MembershipLevel tier)
        {
            var tierName = tier.ToString();
            var historicalRanges = _configuration.GetSection("SyncSettings:HistoricalDataRangeDays");
            
            if (historicalRanges == null || !historicalRanges.Exists())
            {
                _logger.LogWarning("HistoricalDataRangeDays configuration not found, defaulting to 60 days");
                return 60;
            }

            var rangeValue = historicalRanges[tierName];
            if (int.TryParse(rangeValue, out int days) && days > 0)
            {
                return days;
            }

            _logger.LogWarning("Invalid or missing historical data range for tier {Tier}, defaulting to 60 days", tierName);
            return 60;
        }


        public async Task SyncCustomerDataAsync(int customerId)
        {
            _logger.LogInformation("Starting full sync for customer {CustomerId}", customerId);

            try
            {
                // Capture sync start time to use across all sync methods
                // This ensures we don't miss data that arrives during the sync process
                var syncStartTime = DateTime.UtcNow;

                // Add delays between API calls to avoid rate limiting
                const int delayBetweenCallsMs = 2000; // Increased from 1000ms to reduce rate limiting

                await SyncProductsAsync(customerId);
                await Task.Delay(delayBetweenCallsMs);

                await SyncLocationsAsync(customerId);
                await Task.Delay(delayBetweenCallsMs);

                await SyncInventoryLevelsAsync(customerId);
                await Task.Delay(delayBetweenCallsMs);

                await SyncInventoryMovementsAsync(customerId);
                await Task.Delay(delayBetweenCallsMs);

                await SyncTransactionsAsync(customerId, syncStartTime);
                await Task.Delay(delayBetweenCallsMs);

                await SyncSalesAsync(customerId, syncStartTime);
                // await SyncShipmentsAsync(customerId); // Disabled - endpoint returns 404

                _logger.LogInformation("Completed full sync for customer {CustomerId}", customerId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing customer {CustomerId}", customerId);
                throw;
            }
        }

        public async Task SyncSalesAsync(int customerId, DateTime syncStartTime)
        {
            _logger.LogInformation("Syncing sales for customer {CustomerId}", customerId);

            var customer = await _context.Customers
                .Include(c => c.Tenant)
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer?.Tenant?.SkuVaultTenantToken == null || string.IsNullOrWhiteSpace(customer.Tenant.SkuVaultUserToken))
            {
                _logger.LogWarning("Customer {CustomerId} is missing SkuVault tokens (tenant or user)", customerId);
                return;
            }

            // Use Customer.LastSyncedAt for incremental sync
            var fromDate = customer.LastSyncedAt == default ? DateTime.UtcNow.AddDays(-30) : customer.LastSyncedAt;
            var toDate = DateTime.UtcNow;

            // Decrypt tokens before sending to API
            var tenantToken = DecryptToken(customer.Tenant.SkuVaultTenantToken)!;
            var userToken = DecryptToken(customer.Tenant.SkuVaultUserToken)!;

            // SkuVault API has a 7-day maximum date range, so chunk the requests
            var allSales = new List<SkuVaultSaleDto>();
            var chunkStart = fromDate;
            const int daysPerChunk = 6; // Use 6 days to stay under the 7-day limit
            const int delayBetweenChunksMs = 1500; // Increased to 1.5 seconds to avoid rate limiting

            while (chunkStart < toDate)
            {
                var chunkEnd = chunkStart.AddDays(daysPerChunk);
                if (chunkEnd > toDate)
                    chunkEnd = toDate;

                _logger.LogInformation("Requesting sales chunk: {From} to {To}", chunkStart, chunkEnd);
                
                // Use /getsalesbydate endpoint for incremental sales sync
                try
                {
                    var chunkSales = await _apiClient.GetSalesAsync(tenantToken, userToken, chunkStart, chunkEnd);
                    allSales.AddRange(chunkSales);
                }
                catch (HttpRequestException ex) when (ex.Message.Contains("429"))
                {
                    _logger.LogWarning("Rate limited while fetching sales chunk {ChunkStart} to {ChunkEnd}, skipping this chunk", chunkStart, chunkEnd);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to fetch sales for chunk {ChunkStart} to {ChunkEnd}", chunkStart, chunkEnd);
                }

                chunkStart = chunkEnd;
                
                // Add delay between chunks to avoid rate limiting
                if (chunkStart < toDate)
                {
                    await Task.Delay(delayBetweenChunksMs);
                }
            }

            _logger.LogInformation("Received {Count} sales from SkuVault API for customer {CustomerId} (from {FromDate} to {ToDate})", allSales.Count, customerId, fromDate, toDate);

            int added = 0, updated = 0;
            DateTime? latestSaleDate = null;
            foreach (var apiSale in allSales)
            {
                var item = apiSale.SaleItems?.FirstOrDefault();
                if (item == null)
                {
                    _logger.LogWarning($"Sale {apiSale.Id} has no SaleItems, skipping");
                    continue;
                }
                var saleId = apiSale.Id ?? apiSale.MarketplaceId ?? string.Empty;
                var existingSale = await _context.Sales.FirstOrDefaultAsync(s => s.SaleId == saleId && s.CustomerId == customerId);
                if (existingSale != null)
                {
                    existingSale.Sku = item.Sku;
                    existingSale.Quantity = item.Quantity;
                    existingSale.SaleDate = apiSale.SaleDate;
                    existingSale.Channel = apiSale.Marketplace;
                    existingSale.OrderNumber = apiSale.MarketplaceId ?? string.Empty;
                    existingSale.Price = item.UnitPrice?.a ?? 0;
                    existingSale.CustomerName = apiSale.ShippingInfo?.City ?? string.Empty;
                    existingSale.CustomerEmail = string.Empty;
                    updated++;
                }
                else
                {
                    var newSale = new SkuVaultSaaS.Core.Models.Sale
                    {
                        SaleId = saleId,
                        Sku = item.Sku,
                        Quantity = item.Quantity,
                        SaleDate = apiSale.SaleDate,
                        Channel = apiSale.Marketplace,
                        OrderNumber = apiSale.MarketplaceId ?? string.Empty,
                        Price = item.UnitPrice?.a ?? 0,
                        CustomerName = apiSale.ShippingInfo?.City ?? string.Empty,
                        CustomerEmail = string.Empty,
                        CustomerId = customerId
                    };
                    _context.Sales.Add(newSale);
                    added++;
                }
                // Track latest sale date
                if (!latestSaleDate.HasValue || apiSale.SaleDate > latestSaleDate.Value)
                {
                    latestSaleDate = apiSale.SaleDate;
                }
            }

            if (added > 0 || updated > 0)
            {
                await _context.SaveChangesAsync();
            }
            // Always update LastSyncedAt to sync start time
            // This prevents re-syncing the same date range and captures data that arrives during the sync
            customer.LastSyncedAt = syncStartTime;
            await _context.SaveChangesAsync();
            _logger.LogInformation("Sales sync complete for customer {CustomerId}: {Added} added, {Updated} updated, LastSyncedAt={LastSyncedAt}", customerId, added, updated, syncStartTime);
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
            // Decrypt tokens before sending to API
            var tenantToken = DecryptToken(customer.Tenant.SkuVaultTenantToken)!;
            var userToken = DecryptToken(customer.Tenant.SkuVaultUserToken)!;
            
            var apiProducts = await _apiClient.GetProductsAsync(tenantToken, userToken);
            _logger.LogInformation("Received {Count} products from SkuVault API for customer {CustomerId}", apiProducts.Count, customerId);
            
            if (apiProducts.Count == 0)
            {
                _logger.LogWarning("No products returned from SkuVault API for customer {CustomerId}", customerId);
                return;
            }

            // Build lookup of SkuVault SKUs
            var apiSkus = new HashSet<string>(apiProducts.Select(p => p.Sku));

            // Load all local products for this customer
            var localProducts = await _context.Products.Where(p => p.CustomerId == customerId).ToListAsync();
            var localSkuSet = new HashSet<string>(localProducts.Select(p => p.Sku));

            // Upsert (insert/update) products
            foreach (var apiProduct in apiProducts)
            {
                var local = localProducts.FirstOrDefault(p => p.Sku == apiProduct.Sku);
                if (local != null)
                {
                    local.Name = apiProduct.Description;
                    local.Description = apiProduct.LongDescription;
                    local.Category = apiProduct.Classification;
                    local.Cost = apiProduct.Cost;
                    local.Price = apiProduct.RetailPrice;
                    local.UpdatedAtUtc = DateTime.UtcNow;
                }
                else
                {
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
                }
            }

            // Delete local products not present in SkuVault
            var toDelete = localProducts.Where(p => !apiSkus.Contains(p.Sku)).ToList();
            if (toDelete.Count > 0)
            {
                _context.Products.RemoveRange(toDelete);
                _logger.LogInformation("Deleted {Count} products not present in SkuVault for customer {CustomerId}", toDelete.Count, customerId);
            }

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

            // Decrypt tokens before sending to API
            var tenantToken = DecryptToken(customer.Tenant.SkuVaultTenantToken)!;
            var userToken = DecryptToken(customer.Tenant.SkuVaultUserToken)!;

            var apiLocations = await _apiClient.GetLocationsAsync(tenantToken, userToken);

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

            // Decrypt tokens before sending to API
            var tenantToken = DecryptToken(customer.Tenant.SkuVaultTenantToken)!;
            var userToken = DecryptToken(customer.Tenant.SkuVaultUserToken)!;

            var apiInventory = await _apiClient.GetInventoryAsync(tenantToken, userToken);

            // Load all products and locations for this customer to map SKU/LocationCode to IDs
            var products = await _context.Products
                .Where(p => p.CustomerId == customerId)
                .ToDictionaryAsync(p => p.Sku, p => p.Id);

            var locations = await _context.Locations
                .Where(l => l.CustomerId == customerId)
                .ToDictionaryAsync(l => l.Code, l => l.Id);

            // Build lookup of SkuVault inventory keys (SKU + LocationCode)
            var apiKeys = new HashSet<(string Sku, string LocationCode)>(apiInventory.Select(i => (i.Sku, i.LocationCode)));

            // Load all local inventory levels for this customer
            var localLevels = await _context.InventoryLevels
                .Where(i => i.CustomerId == customerId)
                .Include(i => i.Product)
                .Include(i => i.Location)
                .ToListAsync();

            // Upsert (insert/update) inventory levels
            foreach (var apiItem in apiInventory)
            {
                if (!products.TryGetValue(apiItem.Sku, out var productId))
                    continue;
                if (!locations.TryGetValue(apiItem.LocationCode, out var locationId))
                    continue;

                var local = localLevels.FirstOrDefault(i => i.ProductId == productId && i.LocationId == locationId);
                if (local != null)
                {
                    local.QuantityOnHand = apiItem.QuantityOnHand;
                    local.QuantityAvailable = apiItem.QuantityAvailable;
                    local.QuantityAllocated = apiItem.QuantityAllocated;
                    local.UpdatedAtUtc = DateTime.UtcNow;
                }
                else
                {
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

            // Delete local inventory levels not present in SkuVault
            var toDelete = localLevels.Where(i => !apiKeys.Contains((i.Product.Sku, i.Location.Code))).ToList();
            if (toDelete.Count > 0)
            {
                _context.InventoryLevels.RemoveRange(toDelete);
                _logger.LogInformation("Deleted {Count} inventory levels not present in SkuVault for customer {CustomerId}", toDelete.Count, customerId);
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

            // Decrypt tokens before sending to API
            var tenantToken = DecryptToken(customer.Tenant.SkuVaultTenantToken);
            var userToken = DecryptToken(customer.Tenant.SkuVaultUserToken);

            // Use Customer.LastSyncedAt for incremental sync
            DateTime fromDate = customer.LastSyncedAt == default ? DateTime.UtcNow.AddDays(-7) : customer.LastSyncedAt;
            DateTime toDate = DateTime.UtcNow;

            var allApiMovements = new List<SkuVaultInventoryMovementDto>();
            DateTime chunkStart = fromDate;
            while (chunkStart < toDate)
            {
                DateTime chunkEnd = chunkStart.AddDays(6); // Use 6 days to stay under 7-day limit
                if (chunkEnd > toDate) chunkEnd = toDate;
                _logger.LogInformation($"Requesting inventory movements chunk: {chunkStart:u} to {chunkEnd:u}");
                try
                {
                    var chunkMovements = await _apiClient.GetInventoryMovementsAsync(
                        tenantToken!,
                        userToken!,
                        chunkStart,
                        chunkEnd);
                    allApiMovements.AddRange(chunkMovements);
                }
                catch (HttpRequestException ex) when (ex.Message.Contains("429"))
                {
                    _logger.LogWarning("Rate limited while fetching inventory movements chunk {ChunkStart} to {ChunkEnd}, skipping this chunk", chunkStart, chunkEnd);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to fetch inventory movements for chunk {ChunkStart} to {ChunkEnd}", chunkStart, chunkEnd);
                }
                chunkStart = chunkEnd;
                
                // Add delay between chunks to avoid overwhelming the API
                if (chunkStart < toDate)
                {
                    await Task.Delay(1500); // Increased from 1000ms to reduce rate limiting
                }
            }

            var apiMovements = allApiMovements;

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
                        Context = apiMovement.ContextId,
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

        public async Task SyncTransactionsAsync(int customerId, DateTime syncStartTime)
        {
            _logger.LogInformation("Syncing transactions for customer {CustomerId}", customerId);

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

            // Determine if this is an initial sync
            bool isInitialSync = customer.LastSyncedAt == default;
            
            // Determine date range based on initial sync status and customer tier
            DateTime fromDate;
            if (isInitialSync)
            {
                // Initial sync: use historical data range based on membership tier
                int historicalDays = GetHistoricalDataRangeDays(customer.MembershipLevel);
                fromDate = DateTime.UtcNow.AddDays(-historicalDays);
                _logger.LogInformation("Initial sync for customer {CustomerId}, using {Days} day historical range based on {Tier} tier", 
                    customerId, historicalDays, customer.MembershipLevel);
            }
            else
            {
                // Incremental sync: use last sync time
                fromDate = customer.LastSyncedAt;
            }
            
            var toDate = DateTime.UtcNow;

            // Decrypt tokens before sending to API
            var tenantToken = DecryptToken(customer.Tenant.SkuVaultTenantToken);
            var userToken = DecryptToken(customer.Tenant.SkuVaultUserToken);

            // Fetch transactions in 6-day chunks (stay under 7-day limit)
            var allApiTransactions = new List<SkuVaultInventoryMovementDto>();
            DateTime chunkStart = fromDate;
            while (chunkStart < toDate)
            {
                DateTime chunkEnd = chunkStart.AddDays(6); // Use 6 days to stay under 7-day limit
                if (chunkEnd > toDate) chunkEnd = toDate;
                _logger.LogInformation($"Requesting transactions chunk: {chunkStart:u} to {chunkEnd:u}");
                try
                {
                    var chunkTransactions = await _apiClient.GetInventoryMovementsAsync(
                        tenantToken!,
                        userToken!,
                        chunkStart,
                        chunkEnd);
                    allApiTransactions.AddRange(chunkTransactions);
                }
                catch (HttpRequestException ex) when (ex.Message.Contains("429"))
                {
                    _logger.LogWarning("Rate limited while fetching chunk {ChunkStart} to {ChunkEnd}, skipping this chunk", chunkStart, chunkEnd);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to fetch transactions for chunk {ChunkStart} to {ChunkEnd}", chunkStart, chunkEnd);
                }
                chunkStart = chunkEnd;
                
                // Add delay between chunks to avoid overwhelming the API
                if (chunkStart < toDate)
                {
                    await Task.Delay(1500); // Increased from 1000ms to reduce rate limiting
                }
            }

            var apiTransactions = allApiTransactions;

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
                    var skuVaultId = $"{apiTransaction.Sku}_{apiTransaction.TransactionDate:yyyyMMddHHmmss}_{apiTransaction.User}_{apiTransaction.ContextId ?? "unknown"}_{apiTransaction.Quantity}";

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
                        Code = apiTransaction.Code,
                        ScannedCode = apiTransaction.ScannedCode,
                        Title = apiTransaction.Title,
                        Quantity = apiTransaction.Quantity,
                        QuantityBefore = apiTransaction.QuantityBefore,
                        QuantityAfter = apiTransaction.QuantityAfter,
                        TransactionType = apiTransaction.TransactionType,
                        TransactionReason = apiTransaction.TransactionReason,
                        TransactionNote = apiTransaction.TransactionNote,
                        ContextType = apiTransaction.ContextType,
                        ContextId = apiTransaction.ContextId,
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
            
            // Always update LastSyncedAt to sync start time
            // This prevents re-syncing the same date range and captures data that arrives during the sync
            customer.LastSyncedAt = syncStartTime;
            await _context.SaveChangesAsync();
            _logger.LogInformation("Synced {Count} transactions for customer {CustomerId}, LastSyncedAt={LastSyncedAt}", syncedCount, customerId, syncStartTime);
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

        public async Task SyncShipmentsAsync(int customerId)
        {
            _logger.LogInformation("Syncing shipments for customer {CustomerId}", customerId);

            var customer = await _context.Customers
                .Include(c => c.Tenant)
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer?.Tenant?.SkuVaultTenantToken == null || string.IsNullOrWhiteSpace(customer.Tenant.SkuVaultUserToken))
            {
                _logger.LogWarning("Customer {CustomerId} is missing SkuVault tokens (tenant or user)", customerId);
                return;
            }

            var fromDate = customer.LastSyncedAt == default ? DateTime.UtcNow.AddDays(-30) : customer.LastSyncedAt;
            var toDate = DateTime.UtcNow;

            // Decrypt tokens before sending to API
            var tenantToken = DecryptToken(customer.Tenant.SkuVaultTenantToken)!;
            var userToken = DecryptToken(customer.Tenant.SkuVaultUserToken)!;

            var apiShipments = await _apiClient.GetShipmentsAsync(tenantToken, userToken, fromDate, toDate);
            _logger.LogInformation("Received {Count} shipments from SkuVault API for customer {CustomerId}", apiShipments.Count, customerId);

            int added = 0, updated = 0;
            foreach (var apiShipment in apiShipments)
            {
                var existingShipment = await _context.Shipments.FirstOrDefaultAsync(s => s.ShipmentId == apiShipment.ShipmentId && s.CustomerId == customerId);
                if (existingShipment != null)
                {
                    existingShipment.OrderId = apiShipment.OrderId;
                    existingShipment.TrackingNumber = apiShipment.TrackingNumber;
                    existingShipment.Carrier = apiShipment.Carrier;
                    existingShipment.Service = apiShipment.Service;
                    existingShipment.ShippedDate = apiShipment.ShippedDate;
                    existingShipment.UpdatedDateUtc = apiShipment.UpdatedDate;
                    existingShipment.Status = apiShipment.Status;
                    existingShipment.ShippingCost = apiShipment.ShippingCost;
                    existingShipment.RecipientName = apiShipment.RecipientName;
                    existingShipment.RecipientAddress = apiShipment.RecipientAddress;
                    existingShipment.RecipientCity = apiShipment.RecipientCity;
                    existingShipment.RecipientState = apiShipment.RecipientState;
                    existingShipment.RecipientZip = apiShipment.RecipientZip;
                    existingShipment.RecipientCountry = apiShipment.RecipientCountry;
                    updated++;
                }
                else
                {
                    var newShipment = new Shipment
                    {
                        CustomerId = customerId,
                        ShipmentId = apiShipment.ShipmentId,
                        OrderId = apiShipment.OrderId,
                        TrackingNumber = apiShipment.TrackingNumber,
                        Carrier = apiShipment.Carrier,
                        Service = apiShipment.Service,
                        ShippedDate = apiShipment.ShippedDate,
                        CreatedDateUtc = apiShipment.CreatedDate,
                        UpdatedDateUtc = apiShipment.UpdatedDate,
                        Status = apiShipment.Status,
                        ShippingCost = apiShipment.ShippingCost,
                        RecipientName = apiShipment.RecipientName,
                        RecipientAddress = apiShipment.RecipientAddress,
                        RecipientCity = apiShipment.RecipientCity,
                        RecipientState = apiShipment.RecipientState,
                        RecipientZip = apiShipment.RecipientZip,
                        RecipientCountry = apiShipment.RecipientCountry
                    };
                    _context.Shipments.Add(newShipment);
                    added++;
                }
            }

            if (added > 0 || updated > 0)
            {
                await _context.SaveChangesAsync();
            }
            _logger.LogInformation("Shipments sync complete for customer {CustomerId}: {Added} added, {Updated} updated", customerId, added, updated);
        }
    }
}
