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

                // Calculate the sync date range ONCE upfront before any data changes
                // This ensures both transactions and sales use the same historical window
                var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == customerId);
                if (customer == null)
                {
                    _logger.LogWarning("Customer {CustomerId} not found", customerId);
                    return;
                }
                
                bool isInitialSync = customer.LastSyncedAt == default;
                int historicalDays = isInitialSync ? GetHistoricalDataRangeDays(customer.MembershipLevel) : 0;
                var syncFromDate = isInitialSync 
                    ? DateTime.UtcNow.AddDays(-historicalDays)
                    : customer.LastSyncedAt;

                _logger.LogInformation("Sync mode: {Mode}, fromDate: {FromDate}", 
                    isInitialSync ? "Initial" : "Incremental", syncFromDate);

                // Add delays between API calls to avoid rate limiting
                const int delayBetweenCallsMs = 2000;

                // Skip products on initial startup - let the scheduled sync handle it (expensive full reload)
                // Products will sync on the normal 24-hour schedule
                if (!isInitialSync)
                {
                    // await SyncProductsAsync(customerId); // Temporarily disabled for debugging
                    await Task.Delay(delayBetweenCallsMs);
                }
                else
                {
                    _logger.LogInformation("Skipping products sync on initial startup (expensive operation, will run on schedule)");
                }

                await SyncLocationsAsync(customerId);
                await Task.Delay(delayBetweenCallsMs);

                await SyncInventoryLevelsAsync(customerId);
                await Task.Delay(delayBetweenCallsMs);

                // Pass syncFromDate to both methods so they use the same date range
                await SyncTransactionsAsync(customerId, syncStartTime, syncFromDate);
                await Task.Delay(delayBetweenCallsMs);

                await SyncSalesAsync(customerId, syncStartTime, syncFromDate);
                await Task.Delay(delayBetweenCallsMs);

                // TODO: Shipments endpoint requires SaleIds parameter - disabled for now due to API format issues
                // await SyncShipmentsAsync(customerId);
                // await Task.Delay(delayBetweenCallsMs);


                try
                {
                    _logger.LogInformation("[PO] About to sync active purchase orders for customer {CustomerId}", customerId);
                    await SyncPurchaseOrdersAsync(customerId);
                    _logger.LogInformation("[PO] Completed active purchase orders sync for customer {CustomerId}", customerId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[PO] Exception during active purchase orders sync for customer {CustomerId}", customerId);
                }
                await Task.Delay(delayBetweenCallsMs);


                try
                {
                    _logger.LogInformation("[PO-COMPLETED] About to sync completed purchase orders for customer {CustomerId}", customerId);
                    await SyncPurchaseOrdersCompletedAsync(customerId);
                    _logger.LogInformation("[PO-COMPLETED] Completed completed purchase orders sync for customer {CustomerId}", customerId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[PO-COMPLETED] Exception during completed purchase orders sync for customer {CustomerId}", customerId);
                }
                await Task.Delay(delayBetweenCallsMs);


                try
                {
                    _logger.LogInformation("[RECEIVES] About to sync receives history for customer {CustomerId}", customerId);
                    await SyncReceivesHistoryAsync(customerId);
                    _logger.LogInformation("[RECEIVES] Completed receives history sync for customer {CustomerId}", customerId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[RECEIVES] Exception during receives history sync for customer {CustomerId}", customerId);
                }
                await Task.Delay(delayBetweenCallsMs);

                await SyncIntegrationsAsync(customerId);

                // Update LastSyncedAt ONCE at the end after ALL syncs complete successfully
                // This ensures if any sync fails, the next run will retry the full date range
                customer.LastSyncedAt = syncStartTime;
                await _context.SaveChangesAsync();
                
                // CRITICAL: Clear EF Core change tracker after all syncs to release memory
                _context.ChangeTracker.Clear();
                
                _logger.LogInformation("Completed full sync for customer {CustomerId}. LastSyncedAt={LastSyncedAt}", customerId, syncStartTime);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing customer {CustomerId}", customerId);
                throw;
            }
        }

        public async Task SyncSalesAsync(int customerId, DateTime syncStartTime, DateTime syncFromDate)
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

            // Use the syncFromDate passed from main sync method (not customer.LastSyncedAt which may have changed)
            var fromDate = syncFromDate;
            var toDate = DateTime.UtcNow;

            // Decrypt tokens before sending to API
            var tenantToken = DecryptToken(customer.Tenant.SkuVaultTenantToken)!;
            var userToken = DecryptToken(customer.Tenant.SkuVaultUserToken)!;

            // SkuVault API has a 7-day maximum date range, so chunk the requests
            var allSales = new List<SkuVaultSaleDto>();
            var chunkStart = fromDate;
            const int daysPerChunk = 6; // Use 6 days to stay under the 7-day limit
            const int delayBetweenChunksMs = 13000; // 13 seconds = 4.6 calls/min (safely under ~5/min limit)

            while (chunkStart < toDate)
            {
                var chunkEnd = chunkStart.AddDays(daysPerChunk);
                if (chunkEnd > toDate)
                    chunkEnd = toDate;

                _logger.LogInformation("Requesting sales chunk: {From} to {To}", chunkStart, chunkEnd);
                
                // Use /getsalesbydate endpoint for incremental sales sync
                try
                {
                    var chunkSales = await _apiClient.GetSalesByDateAsync(tenantToken, userToken, chunkStart, chunkEnd);
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

            // Batch load existing sales to avoid N+1 queries
            var apiSaleIds = allSales.Select(s => s.Id ?? s.MarketplaceId ?? string.Empty).ToList();
            var existingSales = await _context.Sales
                .Where(s => s.CustomerId == customerId && apiSaleIds.Contains(s.SaleId))
                .ToDictionaryAsync(s => s.SaleId, s => s);

            int added = 0, updated = 0, saleItemsAdded = 0;
            DateTime? latestSaleDate = null;
            var saleItemsToAdd = new List<SaleItem>();

            foreach (var apiSale in allSales)
            {
                // Check for items in MerchantItems or FulfilledItems (not SaleItems which is rarely populated by API)
                var merchantItems = apiSale.MerchantItems?.Count > 0 ? apiSale.MerchantItems : null;
                var fulfilledItems = apiSale.FulfilledItems?.Count > 0 ? apiSale.FulfilledItems : null;
                
                var saleId = apiSale.Id ?? apiSale.MarketplaceId ?? string.Empty;
                
                // Always save the sale record, even if it has no items
                if (existingSales.TryGetValue(saleId, out var existingSale))
                {
                    // Update with first item if available
                    var firstItem = merchantItems?.FirstOrDefault() ?? fulfilledItems?.FirstOrDefault();
                    if (firstItem != null)
                    {
                        existingSale.Sku = firstItem.Sku;
                        existingSale.Quantity = firstItem.Quantity;
                        existingSale.Price = firstItem.UnitPrice?.a ?? 0;
                    }
                    existingSale.SaleDate = apiSale.SaleDate;
                    existingSale.Channel = apiSale.Marketplace;
                    existingSale.ChannelId = apiSale.ChannelId ?? string.Empty;
                    existingSale.OrderNumber = apiSale.MarketplaceId ?? string.Empty;
                    existingSale.CustomerName = apiSale.ShippingInfo?.City ?? string.Empty;
                    existingSale.CustomerEmail = string.Empty;
                    updated++;
                }
                else
                {
                    // Create new sale record with first item data if available
                    var firstItem = merchantItems?.FirstOrDefault() ?? fulfilledItems?.FirstOrDefault();
                    var newSale = new SkuVaultSaaS.Core.Models.Sale
                    {
                        SaleId = saleId,
                        Sku = firstItem?.Sku ?? string.Empty,
                        Quantity = firstItem?.Quantity ?? 0,
                        SaleDate = apiSale.SaleDate,
                        Channel = apiSale.Marketplace,
                        ChannelId = apiSale.ChannelId ?? string.Empty,
                        OrderNumber = apiSale.MarketplaceId ?? string.Empty,
                        Price = firstItem?.UnitPrice?.a ?? 0,
                        CustomerName = apiSale.ShippingInfo?.City ?? string.Empty,
                        CustomerEmail = string.Empty,
                        CustomerId = customerId
                    };
                    _context.Sales.Add(newSale);
                    added++;
                    
                    if ((merchantItems == null || merchantItems.Count == 0) && (fulfilledItems == null || fulfilledItems.Count == 0))
                    {
                        _logger.LogWarning($"Sale {saleId} created with no items (MerchantItems and FulfilledItems both empty)");
                    }
                }

                // Capture all merchant items as SaleItems
                if (merchantItems != null)
                {
                    foreach (var item in merchantItems)
                    {
                        saleItemsToAdd.Add(new SaleItem
                        {
                            SaleId = saleId,
                            CustomerId = customerId,
                            Sku = item.Sku,
                            Quantity = item.Quantity,
                            UnitPrice = item.UnitPrice?.a ?? 0,
                            ItemType = "MerchantItem",
                            CreatedAtUtc = syncStartTime,
                            UpdatedAtUtc = syncStartTime
                        });
                        saleItemsAdded++;
                    }
                }

                // Capture all fulfilled items as SaleItems
                if (fulfilledItems != null)
                {
                    foreach (var item in fulfilledItems)
                    {
                        saleItemsToAdd.Add(new SaleItem
                        {
                            SaleId = saleId,
                            CustomerId = customerId,
                            Sku = item.Sku,
                            Quantity = item.Quantity,
                            UnitPrice = item.UnitPrice?.a ?? 0,
                            ItemType = "FulfilledItem",
                            CreatedAtUtc = syncStartTime,
                            UpdatedAtUtc = syncStartTime
                        });
                        saleItemsAdded++;
                    }
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

            // Add all SaleItems in one batch, filtering out duplicates
            if (saleItemsToAdd.Count > 0)
            {
                // Load only the composite keys (minimal memory footprint)
                var existingSaleItemKeys = new HashSet<string>(
                    await _context.SaleItems
                        .Where(si => si.CustomerId == customerId && apiSaleIds.Contains(si.SaleId))
                        .AsNoTracking()
                        .Select(si => $"{si.SaleId}|{si.Sku}|{si.ItemType}")
                        .ToListAsync()
                );

                var newSaleItems = new List<SaleItem>();
                foreach (var item in saleItemsToAdd)
                {
                    var key = $"{item.SaleId}|{item.Sku}|{item.ItemType}";
                    if (!existingSaleItemKeys.Contains(key))
                    {
                        newSaleItems.Add(item);
                    }
                }

                if (newSaleItems.Count > 0)
                {
                    _context.SaleItems.AddRange(newSaleItems);
                    await _context.SaveChangesAsync();
                }
                
                int skipped = saleItemsToAdd.Count - newSaleItems.Count;
                if (skipped > 0)
                {
                    _logger.LogInformation("Skipped {Count} duplicate sale items for customer {CustomerId}", skipped, customerId);
                }
                
                existingSaleItemKeys?.Clear();
                newSaleItems?.Clear();
            }

            // Clear collections to free memory immediately after processing
            allSales?.Clear();
            allSales = null;
            saleItemsToAdd?.Clear();
            saleItemsToAdd = null;
            apiSaleIds?.Clear();
            apiSaleIds = null;
            existingSales?.Clear();
            existingSales = null;

            // CRITICAL: Clear EF Core change tracker to release all tracked entities from memory
            _context.ChangeTracker.Clear();

            // LastSyncedAt will be updated once after all syncs complete (in SyncCustomerDataAsync)
            _logger.LogInformation("Sales sync complete for customer {CustomerId}: {Added} sales added, {Updated} updated, {SaleItems} items added", customerId, added, updated, saleItemsAdded);
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

            // Process products in batches to reduce memory spike
            const int batchSize = 2000;
            int totalProcessed = 0;
            int totalSaved = 0;

            for (int i = 0; i < apiProducts.Count; i += batchSize)
            {
                var batch = apiProducts.Skip(i).Take(batchSize).ToList();
                
                // Upsert (insert/update) products in this batch
                foreach (var apiProduct in batch)
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

                // Save batch
                var saved = await _context.SaveChangesAsync();
                totalProcessed += batch.Count;
                totalSaved += saved;
                
                _logger.LogInformation("Saved batch of {BatchSize} products ({Processed}/{Total}). Changes: {Saved}", 
                    batch.Count, totalProcessed, apiProducts.Count, saved);
                
                // Clear change tracker to release memory from this batch
                _context.ChangeTracker.Clear();
                batch?.Clear();
                batch = null;
            }

            // After all product batches, handle deletions
            var toDelete = localProducts.Where(p => !apiSkus.Contains(p.Sku)).ToList();
            if (toDelete.Count > 0)
            {
                _context.Products.RemoveRange(toDelete);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Deleted {Count} products not present in SkuVault for customer {CustomerId}", toDelete.Count, customerId);
                toDelete?.Clear();
                toDelete = null;
                _context.ChangeTracker.Clear();
            }
            
            // Clear collections to free memory
            localProducts?.Clear();
            localProducts = null;
            localSkuSet?.Clear();
            localSkuSet = null;
            apiProducts?.Clear();
            apiProducts = null;
            apiSkus?.Clear();
            apiSkus = null;
            
            _logger.LogInformation("Synced {TotalProcessed} products for customer {CustomerId}. Total changes saved: {TotalSaved}", 
                totalProcessed, customerId, totalSaved);
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
            
            // Deduplicate API response - SkuVault may return duplicate locations for same warehouse+code
            var deduplicatedLocations = apiLocations
                .DistinctBy(l => $"{l.WarehouseName}|{l.LocationCode}")
                .ToList();
            
            _logger.LogInformation("API returned {TotalCount} locations, {DeduplicatedCount} after deduplication", 
                apiLocations.Count, deduplicatedLocations.Count);
            
            // Batch load existing locations - use composite key (Warehouse+Code) since location codes can be duplicated across warehouses
            var locationCodes = deduplicatedLocations.Select(l => l.LocationCode).ToList();
            var dbLocations = await _context.Locations
                .Where(l => l.CustomerId == customerId && locationCodes.Contains(l.Code))
                .ToListAsync();
            
            // Deduplicate database results in case there are duplicate entries - take the first occurrence
            var existingLocations = dbLocations
                .DistinctBy(l => $"{l.Warehouse}|{l.Code}")
                .ToDictionary(l => $"{l.Warehouse}|{l.Code}", l => l);
            
            _logger.LogInformation("Found {DbCount} locations in database, {DedupCount} after deduplication", 
                dbLocations.Count, existingLocations.Count);

            foreach (var apiLocation in deduplicatedLocations)
            {
                var compositeKey = $"{apiLocation.WarehouseName}|{apiLocation.LocationCode}";
                if (existingLocations.TryGetValue(compositeKey, out var existingLocation))
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
            
            apiLocations?.Clear();
            apiLocations = null;
            _context.ChangeTracker.Clear();
            
            _logger.LogInformation("Synced {Count} locations for customer {CustomerId}", apiLocations?.Count ?? 0, customerId);
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
                .AsNoTracking()
                .Where(p => p.CustomerId == customerId)
                .ToDictionaryAsync(p => p.Sku, p => p.Id);

            var locations = await _context.Locations
                .AsNoTracking()
                .Where(l => l.CustomerId == customerId)
                .ToListAsync();

            // Build location dictionary, taking first occurrence of each code (duplicates skipped)
            var locationDict = new Dictionary<string, int>();
            foreach (var location in locations)
            {
                if (!locationDict.ContainsKey(location.Code))
                {
                    locationDict[location.Code] = location.Id;
                }
            }

            // Build lookup of SkuVault inventory keys (SKU + LocationCode)
            var apiKeys = new HashSet<(string Sku, string LocationCode)>(apiInventory.Select(i => (i.Sku, i.LocationCode)));

            // Load all local inventory levels for this customer
            var localLevels = await _context.InventoryLevels
                .Where(i => i.CustomerId == customerId)
                .Include(i => i.Product)
                .Include(i => i.Location)
                .ToListAsync();

            // Track keys we've processed in this sync to avoid duplicates from API response
            var processedKeys = new HashSet<(int ProductId, int LocationId)>();

            // Upsert (insert/update) inventory levels
            foreach (var apiItem in apiInventory)
            {
                if (!products.TryGetValue(apiItem.Sku, out var productId))
                    continue;
                if (!locationDict.TryGetValue(apiItem.LocationCode, out var locationId))
                    continue;

                var key = (productId, locationId);
                // Skip if we've already processed this key in this sync (duplicate from API)
                if (processedKeys.Contains(key))
                {
                    _logger.LogWarning("Duplicate inventory entry from API: SKU={Sku}, LocationCode={LocationCode}, skipping", apiItem.Sku, apiItem.LocationCode);
                    continue;
                }
                processedKeys.Add(key);

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
            
            products?.Clear();
            products = null;
            locations?.Clear();
            locations = null;
            locationDict?.Clear();
            locationDict = null;
            apiInventory?.Clear();
            apiInventory = null;
            localLevels?.Clear();
            localLevels = null;
            processedKeys?.Clear();
            processedKeys = null;
            _context.ChangeTracker.Clear();
            
            _logger.LogInformation("Synced inventory levels for customer {CustomerId}", customerId);
        }

        // DECOMMISSIONED: SyncInventoryMovementsAsync - use SyncTransactionsAsync instead

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

        public async Task SyncTransactionsAsync(int customerId, DateTime syncStartTime, DateTime syncFromDate)
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
            
            // Use the syncFromDate passed from main method (calculated before transactions ran)
            // This ensures sales sync uses the same historical window
            var fromDate = syncFromDate;
            var toDate = DateTime.UtcNow;

            _logger.LogInformation("Sync mode: {Mode}, date range: {From} to {To}", 
                isInitialSync ? "Initial" : "Incremental", fromDate, toDate);

            // Decrypt tokens before sending to API
            var tenantToken = DecryptToken(customer.Tenant.SkuVaultTenantToken);
            var userToken = DecryptToken(customer.Tenant.SkuVaultUserToken);

            // Fetch and process transactions in 6-day chunks (stay under 7-day limit)
            // Process each chunk immediately during the delay period instead of accumulating all
            var products = await _context.Products
                .AsNoTracking()
                .Where(p => p.CustomerId == customerId)
                .ToDictionaryAsync(p => p.Sku, p => p.Id);

            var locationList = await _context.Locations
                .AsNoTracking()
                .Where(l => l.CustomerId == customerId)
                .ToListAsync();

            // Build location dictionary, taking first occurrence of each code (duplicates skipped)
            var locations = new Dictionary<string, int>();
            foreach (var location in locationList)
            {
                if (!locations.ContainsKey(location.Code))
                {
                    locations[location.Code] = location.Id;
                }
            }

            // Load all existing transaction SkuVaultIds for this customer into memory (single query)
            var existingSkuVaultIds = new HashSet<string>(
                await _context.Transactions
                    .Where(t => t.CustomerId == customerId)
                    .AsNoTracking()
                    .Select(t => t.SkuVaultId)
                    .ToListAsync()
            );
            _logger.LogInformation("Loaded {Count} existing transaction IDs for customer {CustomerId}", existingSkuVaultIds.Count, customerId);

            const int batchSize = 500;
            int totalSyncedCount = 0;
            DateTime chunkStart = fromDate;
            while (chunkStart < toDate)
            {
                DateTime chunkEnd = chunkStart.AddDays(6);
                if (chunkEnd > toDate) chunkEnd = toDate;
                _logger.LogInformation($"Requesting transactions chunk: {chunkStart:u} to {chunkEnd:u}");
                try
                {
                    var chunkTransactions = await _apiClient.GetInventoryMovementsAsync(
                        tenantToken!,
                        userToken!,
                        chunkStart,
                        chunkEnd);
                    
                    // Process this chunk immediately during the delay
                    _logger.LogInformation("Processing {Count} transactions from chunk {ChunkStart} to {ChunkEnd} during delay period", 
                        chunkTransactions.Count, chunkStart, chunkEnd);
                    
                    int chunkSyncedCount = await ProcessTransactionChunkAsync(chunkTransactions, customerId, products, locations, 
                        existingSkuVaultIds, batchSize);
                    totalSyncedCount += chunkSyncedCount;
                    
                    // Explicitly dispose/clear chunk to free memory immediately after processing
                    chunkTransactions?.Clear();
                    chunkTransactions = null;
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
                
                if (chunkStart < toDate)
                {
                    _logger.LogInformation("Waiting 13 seconds before next chunk...");
                    await Task.Delay(13000);
                }
            }

            _logger.LogInformation("Transaction sync complete for customer {CustomerId}: {SyncedCount} transactions synced", 
                customerId, totalSyncedCount);

            // Clear large collections to free memory immediately after processing
            products?.Clear();
            products = null;
            locations?.Clear();
            locations = null;
            locationList?.Clear();
            locationList = null;
            existingSkuVaultIds?.Clear();
            existingSkuVaultIds = null;
            
            // CRITICAL: Clear EF Core change tracker to release all tracked entities from memory
            _context.ChangeTracker.Clear();
        }

        /// <summary>
        /// Process a single chunk of transactions from the API.
        /// This is called immediately after fetching during the delay period.
        /// </summary>
        private async Task<int> ProcessTransactionChunkAsync(
            List<SkuVaultInventoryMovementDto> chunkTransactions,
            int customerId,
            Dictionary<string, int> products,
            Dictionary<string, int> locations,
            HashSet<string> existingSkuVaultIds,
            int batchSize)
        {
            int chunkSyncedCount = 0;
            List<Transaction> transactionsToAdd = new List<Transaction>();

            foreach (var apiTransaction in chunkTransactions)
            {
                try
                {
                    if (!products.TryGetValue(apiTransaction.Sku, out var productId))
                    {
                        _logger.LogDebug("Product SKU {Sku} not found for customer {CustomerId}, skipping transaction", apiTransaction.Sku, customerId);
                        continue;
                    }

                    var skuVaultId = $"{apiTransaction.Sku}_{apiTransaction.TransactionDate:yyyyMMddHHmmss}_{apiTransaction.User}_{apiTransaction.ContextId ?? "unknown"}_{apiTransaction.Quantity}";

                    if (existingSkuVaultIds.Contains(skuVaultId))
                    {
                        _logger.LogDebug("Transaction {SkuVaultId} already exists, skipping", skuVaultId);
                        continue;
                    }

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
                        TransactionDate = apiTransaction.TransactionDate
                    };

                    transactionsToAdd.Add(newTransaction);
                    existingSkuVaultIds.Add(skuVaultId);
                    chunkSyncedCount++;

                    if (transactionsToAdd.Count >= batchSize)
                    {
                        _context.Transactions.AddRange(transactionsToAdd);
                        await _context.SaveChangesAsync();
                        _context.ChangeTracker.Clear();
                        _logger.LogInformation("Batch saved {Count} transactions (chunk progress: {Progress}/{Total})", 
                            batchSize, chunkSyncedCount, chunkTransactions.Count);
                        transactionsToAdd.Clear();
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing transaction for SKU {Sku}", apiTransaction.Sku);
                }
            }

            if (transactionsToAdd.Count > 0)
            {
                _context.Transactions.AddRange(transactionsToAdd);
                await _context.SaveChangesAsync();
                _context.ChangeTracker.Clear();
                _logger.LogInformation("Final batch saved {Count} transactions from chunk", transactionsToAdd.Count);
            }
            
            transactionsToAdd?.Clear();
            transactionsToAdd = null;

            return chunkSyncedCount;
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

            // Decrypt tokens before sending to API
            var tenantToken = DecryptToken(customer.Tenant.SkuVaultTenantToken)!;
            var userToken = DecryptToken(customer.Tenant.SkuVaultUserToken)!;

            if (string.IsNullOrWhiteSpace(tenantToken) || string.IsNullOrWhiteSpace(userToken))
            {
                _logger.LogError("Customer {CustomerId} has empty tokens after decryption. TenantToken length: {TenantLength}, UserToken length: {UserLength}", 
                    customerId, tenantToken?.Length ?? 0, userToken?.Length ?? 0);
                return;
            }

            // Get all sales for this customer to pass SaleIds to shipments endpoint
            var saleIds = await _context.Sales
                .Where(s => s.CustomerId == customerId)
                .Select(s => s.SaleId)
                .ToListAsync();
            
            if (saleIds.Count == 0)
            {
                _logger.LogInformation("No sales found for customer {CustomerId}, skipping shipments sync", customerId);
                return;
            }

            _logger.LogInformation("Fetching shipments for {SaleCount} sales for customer {CustomerId} (TenantToken: {TenantLength} chars)", saleIds.Count, customerId, tenantToken.Length);
            var apiShipments = await _apiClient.GetShipmentsAsync(tenantToken, userToken, saleIds);
            _logger.LogInformation("Received {Count} shipments from SkuVault API for customer {CustomerId}", apiShipments.Count, customerId);

            int added = 0, updated = 0;
            foreach (var apiShipment in apiShipments)
            {
                var existingShipment = await _context.Shipments.FirstOrDefaultAsync(s => s.ShipmentId == apiShipment.ShipmentId && s.CustomerId == customerId);
                if (existingShipment != null)
                {
                    existingShipment.SaleId = apiShipment.SaleId;
                    existingShipment.OrderId = apiShipment.OrderId;
                    existingShipment.Source = apiShipment.Source;
                    existingShipment.TrackingNumber = apiShipment.TrackingNumber;
                    existingShipment.Carrier = apiShipment.Carrier;
                    existingShipment.Service = apiShipment.Service;
                    existingShipment.Class = apiShipment.Class;
                    existingShipment.Type = apiShipment.Type;
                    existingShipment.ShippedDate = apiShipment.ShippedDate;
                    existingShipment.UpdatedDateUtc = apiShipment.UpdatedDate;
                    existingShipment.EstimatedShipDate = apiShipment.EstimatedShipDate;
                    existingShipment.EstimatedDeliveryDate = apiShipment.EstimatedDeliveryDate;
                    existingShipment.Status = apiShipment.Status;
                    existingShipment.AlternateId = apiShipment.AlternateId;
                    existingShipment.ManifestId = apiShipment.ManifestId;
                    existingShipment.Note = apiShipment.Note;
                    existingShipment.TotalWeight = apiShipment.TotalWeight;
                    existingShipment.WeightUnit = apiShipment.WeightUnit;
                    existingShipment.TrackingUrl = apiShipment.TrackingUrl;
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
                        SaleId = apiShipment.SaleId,
                        OrderId = apiShipment.OrderId,
                        Source = apiShipment.Source,
                        TrackingNumber = apiShipment.TrackingNumber,
                        Carrier = apiShipment.Carrier,
                        Service = apiShipment.Service,
                        Class = apiShipment.Class,
                        Type = apiShipment.Type,
                        ShippedDate = apiShipment.ShippedDate,
                        CreatedDateUtc = apiShipment.CreatedDate,
                        UpdatedDateUtc = apiShipment.UpdatedDate,
                        EstimatedShipDate = apiShipment.EstimatedShipDate,
                        EstimatedDeliveryDate = apiShipment.EstimatedDeliveryDate,
                        Status = apiShipment.Status,
                        AlternateId = apiShipment.AlternateId,
                        ManifestId = apiShipment.ManifestId,
                        Note = apiShipment.Note,
                        TotalWeight = apiShipment.TotalWeight,
                        WeightUnit = apiShipment.WeightUnit,
                        TrackingUrl = apiShipment.TrackingUrl,
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
            
            // Clear large collections to free memory
            saleIds?.Clear();
            saleIds = null;
            apiShipments?.Clear();
            apiShipments = null;
            
            // CRITICAL: Clear EF Core change tracker to release all tracked entities from memory
            _context.ChangeTracker.Clear();
            
            _logger.LogInformation("Shipments sync complete for customer {CustomerId}: {Added} added, {Updated} updated", customerId, added, updated);
        }

        public async Task SyncPurchaseOrdersAsync(int customerId, DateTime? syncFromDate = null)
        {
            _logger.LogInformation("Syncing active (non-completed) purchase orders for customer {CustomerId}", customerId);

            var customer = await _context.Customers
                .Include(c => c.Tenant)
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer?.Tenant?.SkuVaultTenantToken == null || string.IsNullOrWhiteSpace(customer.Tenant.SkuVaultUserToken))
            {
                _logger.LogWarning("Customer {CustomerId} is missing SkuVault tokens (tenant or user)", customerId);
                return;
            }

            var fromDate = syncFromDate ?? (customer.LastSyncedAt == default ? DateTime.UtcNow.AddDays(-30) : customer.LastSyncedAt);
            var toDate = DateTime.UtcNow;

            // Decrypt tokens before sending to API
            var tenantToken = DecryptToken(customer.Tenant.SkuVaultTenantToken)!;
            var userToken = DecryptToken(customer.Tenant.SkuVaultUserToken)!;

            // status=null means API returns non-Completed POs (active)
            var apiPos = await _apiClient.GetPurchaseOrdersAsync(tenantToken, userToken, fromDate, toDate, status: null);
            _logger.LogInformation("Received {Count} active purchase orders from SkuVault API for customer {CustomerId}", apiPos.Count, customerId);

            await UpdatePurchaseOrdersInDatabase(customerId, apiPos, "Active");
        }

        public async Task SyncPurchaseOrdersCompletedAsync(int customerId, DateTime? syncFromDate = null)
        {
            _logger.LogInformation("Syncing completed purchase orders for customer {CustomerId} (for lead time analysis)", customerId);

            var customer = await _context.Customers
                .Include(c => c.Tenant)
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer?.Tenant?.SkuVaultTenantToken == null || string.IsNullOrWhiteSpace(customer.Tenant.SkuVaultUserToken))
            {
                _logger.LogWarning("Customer {CustomerId} is missing SkuVault tokens (tenant or user)", customerId);
                return;
            }

            var fromDate = syncFromDate ?? (customer.LastSyncedAt == default ? DateTime.UtcNow.AddDays(-90) : customer.LastSyncedAt);
            var toDate = DateTime.UtcNow;

            // Decrypt tokens before sending to API
            var tenantToken = DecryptToken(customer.Tenant.SkuVaultTenantToken)!;
            var userToken = DecryptToken(customer.Tenant.SkuVaultUserToken)!;

            _logger.LogInformation("Syncing completed POs from {FromDate} to {ToDate} - will chunk into monthly periods", fromDate, toDate);

            // Break large date ranges into monthly chunks to avoid timeouts and respect throttling
            var dateChunks = GetMonthlyDateChunks(fromDate, toDate);
            _logger.LogInformation("Created {ChunkCount} monthly chunks for completed PO sync", dateChunks.Count);

            int totalAdded = 0, totalUpdated = 0;
            const int delayBetweenChunksMs = 12000; // 12 second delay - respects 5 calls/minute throttle limit

            for (int i = 0; i < dateChunks.Count; i++)
            {
                var chunk = dateChunks[i];
                _logger.LogInformation("Processing completed PO chunk {Current}/{Total}: {FromDate} to {ToDate}", 
                    i + 1, dateChunks.Count, chunk.from, chunk.to);

                try
                {
                    // status="Completed" retrieves only completed POs for historical analysis
                    var apiPos = await _apiClient.GetPurchaseOrdersAsync(tenantToken, userToken, chunk.from, chunk.to, status: "Completed");
                    _logger.LogInformation("Received {Count} completed purchase orders for chunk {Current}/{Total}", apiPos.Count, i + 1, dateChunks.Count);

                    var (added, updated) = await UpdatePurchaseOrdersInDatabase(customerId, apiPos, $"Completed (chunk {i + 1}/{dateChunks.Count})");
                    totalAdded += added;
                    totalUpdated += updated;

                    // Delay before next chunk to respect throttling
                    if (i < dateChunks.Count - 1)
                    {
                        await Task.Delay(delayBetweenChunksMs);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error syncing completed POs chunk {Current}/{Total}: {FromDate} to {ToDate}", 
                        i + 1, dateChunks.Count, chunk.from, chunk.to);
                    throw; // Re-throw to let caller handle
                }
            }

            _logger.LogInformation("Completed PO sync finished for customer {CustomerId}: {Added} added, {Updated} updated across {ChunkCount} chunks", 
                customerId, totalAdded, totalUpdated, dateChunks.Count);
        }

        private List<(DateTime from, DateTime to)> GetMonthlyDateChunks(DateTime startDate, DateTime endDate)
        {
            var chunks = new List<(DateTime from, DateTime to)>();
            var current = startDate;

            while (current < endDate)
            {
                // Calculate end of month or endDate, whichever comes first
                var monthEnd = new DateTime(current.Year, current.Month, 1).AddMonths(1).AddDays(-1);
                var chunkEnd = monthEnd < endDate ? monthEnd : endDate;

                chunks.Add((current, chunkEnd));
                current = chunkEnd.AddDays(1);
            }

            return chunks;
        }

        private async Task<(int added, int updated)> UpdatePurchaseOrdersInDatabase(int customerId, List<SkuVaultPurchaseOrderDto> apiPos, string syncType)
        {
            int added = 0, updated = 0;
            
            // Batch load all existing POs for this customer to avoid N+1 queries
            var poIds = apiPos.Select(p => p.PoId).ToList();
            var existingPos = await _context.PurchaseOrders
                .Where(p => p.CustomerId == customerId && poIds.Contains(p.PoId))
                .ToDictionaryAsync(p => p.PoId, p => p);
            
            foreach (var apiPo in apiPos)
            {
                var existingPo = existingPos.TryGetValue(apiPo.PoId, out var po) ? po : null;
                if (existingPo != null)
                {
                    existingPo.PoNumber = apiPo.PoNumber;
                    existingPo.Status = apiPo.Status;
                    existingPo.PaymentStatus = apiPo.PaymentStatus;
                    existingPo.SentStatus = apiPo.SentStatus;
                    existingPo.SupplierName = apiPo.SupplierName;
                    existingPo.CreatedDate = apiPo.CreatedDate;
                    existingPo.OrderDate = apiPo.OrderDate;
                    existingPo.OrderCancelDate = apiPo.OrderCancelDate;
                    existingPo.ArrivalDueDate = apiPo.ArrivalDueDate;
                    existingPo.RequestedShipDate = apiPo.RequestedShipDate;
                    existingPo.ActualShippedDate = apiPo.ActualShippedDate;
                    existingPo.TrackingInfo = apiPo.TrackingInfo;
                    existingPo.PublicNotes = apiPo.PublicNotes;
                    existingPo.PrivateNotes = apiPo.PrivateNotes;
                    existingPo.TermsName = apiPo.TermsName;
                    existingPo.ShipToWarehouse = apiPo.ShipToWarehouse;
                    existingPo.ShipToAddress = apiPo.ShipToAddress;
                    existingPo.CarrierName = apiPo.CarrierName;
                    existingPo.ClassName = apiPo.ClassName;
                    existingPo.LineItemCount = apiPo.LineItemCount;
                    existingPo.TotalCost = apiPo.TotalCost;
                    existingPo.UpdatedDateUtc = DateTime.UtcNow;
                    updated++;
                }
                else
                {
                    var newPo = new PurchaseOrder
                    {
                        CustomerId = customerId,
                        PoId = apiPo.PoId,
                        PoNumber = apiPo.PoNumber,
                        Status = apiPo.Status,
                        PaymentStatus = apiPo.PaymentStatus,
                        SentStatus = apiPo.SentStatus,
                        SupplierName = apiPo.SupplierName,
                        CreatedDate = apiPo.CreatedDate,
                        OrderDate = apiPo.OrderDate,
                        OrderCancelDate = apiPo.OrderCancelDate,
                        ArrivalDueDate = apiPo.ArrivalDueDate,
                        RequestedShipDate = apiPo.RequestedShipDate,
                        ActualShippedDate = apiPo.ActualShippedDate,
                        TrackingInfo = apiPo.TrackingInfo,
                        PublicNotes = apiPo.PublicNotes,
                        PrivateNotes = apiPo.PrivateNotes,
                        TermsName = apiPo.TermsName,
                        ShipToWarehouse = apiPo.ShipToWarehouse,
                        ShipToAddress = apiPo.ShipToAddress,
                        CarrierName = apiPo.CarrierName,
                        ClassName = apiPo.ClassName,
                        LineItemCount = apiPo.LineItemCount,
                        TotalCost = apiPo.TotalCost,
                        CreatedDateUtc = DateTime.UtcNow,
                        UpdatedDateUtc = DateTime.UtcNow
                    };
                    _context.PurchaseOrders.Add(newPo);
                    added++;
                }
            }

            if (added > 0 || updated > 0)
            {
                await _context.SaveChangesAsync();
            }
            
            apiPos?.Clear();
            apiPos = null;
            existingPos?.Clear();
            existingPos = null;
            _context.ChangeTracker.Clear();
            
            _logger.LogInformation("Purchase orders sync complete ({SyncType}) for customer {CustomerId}: {Added} added, {Updated} updated", syncType, customerId, added, updated);
            
            return (added, updated);
        }

        public async Task SyncIntegrationsAsync(int customerId)
        {
            _logger.LogInformation("Syncing integrations for customer {CustomerId}", customerId);

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

            var apiIntegrations = await _apiClient.GetIntegrationsAsync(tenantToken, userToken);
            _logger.LogInformation("Received {Count} integrations from SkuVault API for customer {CustomerId}", apiIntegrations.Count, customerId);

            // Batch load existing integrations
            var integrationIds = apiIntegrations.Select(i => i.Id).ToList();
            var existingIntegrations = await _context.Integrations
                .Where(i => i.TenantId == customer.TenantId && integrationIds.Contains(i.SkuVaultId))
                .ToDictionaryAsync(i => i.SkuVaultId, i => i);

            int added = 0, updated = 0;
            foreach (var apiIntegration in apiIntegrations)
            {
                if (existingIntegrations.TryGetValue(apiIntegration.Id, out var existingIntegration))
                {
                    existingIntegration.SkuVaultLongId = apiIntegration.LongId;
                    existingIntegration.Name = apiIntegration.Name;
                    existingIntegration.Type = apiIntegration.Type;
                    existingIntegration.UpdatedAt = DateTime.UtcNow;
                    updated++;
                }
                else
                {
                    var newIntegration = new Integration
                    {
                        TenantId = customer.TenantId,
                        SkuVaultId = apiIntegration.Id,
                        SkuVaultLongId = apiIntegration.LongId,
                        Name = apiIntegration.Name,
                        Type = apiIntegration.Type,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Integrations.Add(newIntegration);
                    added++;
                }
            }

            if (added > 0 || updated > 0)
            {
                await _context.SaveChangesAsync();
            }
            
            apiIntegrations?.Clear();
            apiIntegrations = null;
            _context.ChangeTracker.Clear();
            
            _logger.LogInformation("Integrations sync complete for customer {CustomerId}: {Added} added, {Updated} updated", customerId, added, updated);
        }

        /// <summary>
        /// Gets raw API transaction data for export/comparison (Admin use only)
        /// Returns dynamic objects to preserve API response structure
        /// </summary>
        public async Task<List<dynamic>> GetApiTransactionsForExport(string tenantToken, string userToken, DateTime fromDate, DateTime toDate)
        {
            _logger.LogInformation("Fetching raw API transactions for export from {From} to {To}", fromDate, toDate);

            var transactions = await _apiClient.GetInventoryMovementsAsync(tenantToken, userToken, fromDate, toDate);

            _logger.LogInformation("Retrieved {Count} transactions from SkuVault API", transactions.Count);

            // Convert SkuVaultInventoryMovementDto to dynamic objects to maintain structure
            var result = new List<dynamic>();
            foreach (var txn in transactions)
            {
                result.Add(new
                {
                    txn.Sku,
                    txn.Location,
                    txn.TransactionType,
                    txn.Quantity,
                    txn.TransactionDate,
                    txn.User,
                    txn.ContextId
                });
            }

            return result;
        }

        public async Task SyncReceivesHistoryAsync(int customerId, DateTime? syncFromDate = null)
        {
            var customer = await _context.Customers.Include(c => c.Tenant).FirstOrDefaultAsync(c => c.Id == customerId);
            if (customer?.Tenant == null || string.IsNullOrEmpty(customer.Tenant.SkuVaultTenantToken) || string.IsNullOrEmpty(customer.Tenant.SkuVaultUserToken))
            {
                _logger.LogWarning("Skipping receives history sync for customer {CustomerId}: no SkuVault credentials", customerId);
                return;
            }

            try
            {
                // Decrypt tokens before sending to API (CRITICAL - tokens are stored encrypted)
                var tenantToken = DecryptToken(customer.Tenant.SkuVaultTenantToken)!;
                var userToken = DecryptToken(customer.Tenant.SkuVaultUserToken)!;

                var fromDate = syncFromDate ?? (customer.LastSyncedAt != DateTime.MinValue ? customer.LastSyncedAt : DateTime.UtcNow.AddDays(-90));
                _logger.LogInformation("Syncing receives history for customer {CustomerId} from {FromDate}", customerId, fromDate);

                var receives = await _apiClient.GetReceivesHistoryAsync(tenantToken, userToken, fromDate, null, null);

                // Process receives
                var (receivesAdded, receivesUpdated) = await UpdateReceivesInDatabase(customerId, receives.Receives);
                _logger.LogInformation("Receives sync for customer {CustomerId}: {Added} added, {Updated} updated", 
                    customerId, receivesAdded, receivesUpdated);

                // Process corrections
                var (correctionsAdded, correctionsUpdated) = await UpdateReceiveCorrectionsInDatabase(customerId, receives.Corrections);
                _logger.LogInformation("Receives corrections sync for customer {CustomerId}: {Added} added, {Updated} updated", 
                    customerId, correctionsAdded, correctionsUpdated);
            }
            catch (HttpRequestException ex) when (ex.Message.Contains("401"))
            {
                // 401 Unauthorized - customer may not have access to this endpoint or tokens are invalid
                // This is not a critical failure, log as warning and continue
                _logger.LogWarning(ex, "Customer {CustomerId} not authorized for receives history endpoint (may not have premium access)", customerId);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP error syncing receives history for customer {CustomerId}", customerId);
                // Don't rethrow - continue with rest of sync
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing receives history for customer {CustomerId}", customerId);
                // Don't rethrow - continue with rest of sync
            }
        }

        private async Task<(int added, int updated)> UpdateReceivesInDatabase(int customerId, List<SkuVaultReceiveDto> apiReceives)
        {
            int added = 0, skipped = 0;

            var existingPoNumbers = apiReceives.Select(r => r.PONumber).Distinct().ToList();
            var existingReceivesKeys = new HashSet<string>(
                await _context.PurchaseOrderReceives
                    .Where(r => r.CustomerId == customerId && existingPoNumbers.Contains(r.PONumber))
                    .AsNoTracking()
                    .Select(r => $"{r.CustomerId}|{r.PONumber}|{r.SKU}|{r.ReceivedDate:yyyy-MM-dd}")
                    .ToListAsync()
            );

            var processedKeys = new HashSet<string>();
            var newReceives = new List<PurchaseOrderReceive>();

            foreach (var apiReceive in apiReceives)
            {
                var keyStr = $"{customerId}|{apiReceive.PONumber}|{apiReceive.SKU}|{apiReceive.ReceivedDate:yyyy-MM-dd}";
                if (existingReceivesKeys.Contains(keyStr) || processedKeys.Contains(keyStr))
                {
                    skipped++;
                    continue;
                }
                processedKeys.Add(keyStr);
                
                newReceives.Add(new PurchaseOrderReceive
                {
                    CustomerId = customerId,
                    PONumber = apiReceive.PONumber,
                    PartNumber = apiReceive.PartNumber,
                    SKU = apiReceive.SKU,
                    Code = apiReceive.Code,
                    Quantity = apiReceive.Quantity,
                    Quantity3PL = apiReceive.Quantity3pl,
                    QuantityToLocation = apiReceive.QuantityToLocation,
                    ReceiptDate = apiReceive.ReceiptDate,
                    ReceivedDate = apiReceive.ReceivedDate,
                    Location = apiReceive.Location,
                    Warehouse = apiReceive.Warehouse,
                    Username = apiReceive.Username,
                    CreatedDateUtc = DateTime.UtcNow,
                    UpdatedDateUtc = DateTime.UtcNow
                });
            }

            if (newReceives.Count > 0)
            {
                _context.PurchaseOrderReceives.AddRange(newReceives);
                try
                {
                    await _context.SaveChangesAsync();
                    added = newReceives.Count;
                }
                catch (DbUpdateException ex) when (ex.InnerException?.Message?.Contains("Duplicate entry") == true)
                {
                    _logger.LogWarning("Duplicate receives detected, skipping for customer {CustomerId}", customerId);
                    _context.ChangeTracker.Clear();
                }
            }
            
            if (skipped > 0)
            {
                _logger.LogInformation("Skipped {Count} duplicate receives for customer {CustomerId}", skipped, customerId);
            }
            
            apiReceives?.Clear();
            existingReceivesKeys?.Clear();
            processedKeys?.Clear();
            newReceives?.Clear();
            _context.ChangeTracker.Clear();

            return (added, 0);
        }

        private async Task<(int added, int updated)> UpdateReceiveCorrectionsInDatabase(int customerId, List<SkuVaultReceiveCorrectionDto> apiCorrections)
        {
            int added = 0, updated = 0;

            var existingPoNumbers = apiCorrections.Select(c => c.PONumber).Distinct().ToList();
            var existingCorrections = await _context.PurchaseOrderReceiveCorrections
                .Where(c => c.CustomerId == customerId && existingPoNumbers.Contains(c.PONumber))
                .ToDictionaryAsync(c => new { c.PONumber, c.PartNumber, c.CorrectedDate }, c => c);

            foreach (var apiCorrection in apiCorrections)
            {
                var key = new { PONumber = apiCorrection.PONumber, PartNumber = apiCorrection.PartNumber, CorrectedDate = apiCorrection.CorrectedDate };

                if (existingCorrections.TryGetValue(key, out var existing))
                {
                    // Update existing record
                    existing.SKU = apiCorrection.SKU;
                    existing.Code = apiCorrection.Code;
                    existing.OldQuantity = apiCorrection.OldQuantity;
                    existing.NewQuantity = apiCorrection.NewQuantity;
                    existing.OldQuantity3PL = apiCorrection.OldQuantity3pl;
                    existing.NewQuantity3PL = apiCorrection.NewQuantity3pl;
                    existing.ReceivedDate = apiCorrection.ReceivedDate;
                    existing.Username = apiCorrection.Username;
                    existing.UpdatedDateUtc = DateTime.UtcNow;
                    updated++;
                }
                else
                {
                    // Add new record
                    var newCorrection = new PurchaseOrderReceiveCorrection
                    {
                        CustomerId = customerId,
                        PONumber = apiCorrection.PONumber,
                        PartNumber = apiCorrection.PartNumber,
                        SKU = apiCorrection.SKU,
                        Code = apiCorrection.Code,
                        OldQuantity = apiCorrection.OldQuantity,
                        NewQuantity = apiCorrection.NewQuantity,
                        OldQuantity3PL = apiCorrection.OldQuantity3pl,
                        NewQuantity3PL = apiCorrection.NewQuantity3pl,
                        CorrectedDate = apiCorrection.CorrectedDate,
                        ReceivedDate = apiCorrection.ReceivedDate,
                        Username = apiCorrection.Username,
                        CreatedDateUtc = DateTime.UtcNow,
                        UpdatedDateUtc = DateTime.UtcNow
                    };
                    _context.PurchaseOrderReceiveCorrections.Add(newCorrection);
                    added++;
                }
            }

            if (added > 0 || updated > 0)
            {
                await _context.SaveChangesAsync();
            }
            
            apiCorrections?.Clear();
            apiCorrections = null;
            existingCorrections?.Clear();
            existingCorrections = null;
            _context.ChangeTracker.Clear();

            return (added, updated);
        }
    }
}
