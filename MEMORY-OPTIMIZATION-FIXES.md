# Memory Leak & Optimization Fixes

## Critical Issues Found

### 1. **ReportsController - Loading ALL Transactions Into Memory** ⚠️ CRITICAL
**Location:** `ReportsController.cs` lines 265-500+

**Problem:**
```csharp
// BAD - Loads ALL 30 days of transactions into memory
var transactions = await _context.Transactions
    .Where(t => t.CustomerId == customerId && t.TransactionDate >= last30Days)
    .ToListAsync();  // <-- ALL ROWS IN MEMORY

var movements = await _context.Transactions
    .Where(t => t.CustomerId == customerId && t.TransactionDate >= last30Days)
    .ToListAsync();  // <-- DUPLICATE LOAD

// Then aggregates in-memory
movements.Sum(m => Math.Abs(m.Quantity))
movements.Select(m => m.User).Distinct().Count()
```

**Impact:** 
- For 1M transactions: ~150-200MB per request
- With multiple concurrent requests: **OOM quickly**
- All inventory data grouped in-memory in aging report: **500MB+**

**Fix:** Move aggregation to database query

---

### 2. **Aging Inventory Report - FIFO Logic in Memory** ⚠️ CRITICAL
**Location:** `ReportsController.cs` lines 440-520+

**Problem:**
```csharp
// Loads ALL transactions for customer
var allTransactions = await _context.Transactions
    .AsNoTracking()
    .Where(t => t.CustomerId == customerId)
    .OrderBy(t => t.TransactionDate)
    .ToListAsync();  // <-- ALL ROWS

// Then processes FIFO in-memory
var grouped = allTransactions
    .GroupBy(t => new { t.Sku, t.LocationId })
    .ToList();

foreach (var g in grouped)
{
    // FIFO calculations in-memory
    var receivedBatches = transactions
        .Where(t => (t.TransactionType == "Add" || t.TransactionType == "Return") && t.Quantity > 0)
        .OrderBy(t => t.TransactionDate)
        .Select(t => new { t.TransactionDate, t.Quantity })
        .ToList();
}
```

**Impact:**
- Could load **millions of rows** into memory
- **500MB-2GB** for large inventories
- FIFO logic runs 1000s of iterations in-memory

---

### 3. **Demo Data Refresh Service - Unbounded Collection Growth**
**Location:** `DemoDataRefreshService.cs` lines 160-300+

**Problem:**
```csharp
var demoProducts = new List<Product> { /* 100+ items */ };
var sales = new List<Sale>();  // Grows unbounded
var transactions = new List<Transaction>();  // Grows unbounded

// All held in memory until SaveChangesAsync
context.BulkInsert(transactions); // 10K+ items
```

**Impact:**
- Generates 10K+ demo records on each refresh
- All held in memory during bulk insert
- Service runs every 5-30 seconds in demo

---

### 4. **AdminController - Database Query Not Closing Connection**
**Location:** `AdminController.cs` lines 386-450

**Problem:**
```csharp
var dbSizeCommand = _context.Database.GetDbConnection().CreateCommand();
dbSizeCommand.CommandText = dbSizeQuery;
await _context.Database.OpenConnectionAsync();
// No using statement or try/finally to close connection
```

**Impact:**
- **Connection leak** - connections never returned to pool
- Pool exhaustion after a few admin dashboard views
- Leads to application-wide connection starvation

---

### 5. **SkuVault API Client - Large Paginated Responses Buffered**
**Location:** `SkuVaultApiClient.cs` lines 320-370+

**Problem:**
```csharp
var allProducts = new List<SkuVaultProductDto>();
while (true)
{
    var page = await _httpClient.PostAsJsonAsync(...);  
    var pageData = await response.Content.ReadAsAsync<List<...>>();
    allProducts.AddRange(pageData);  // <-- Accumulates all pages
}
return allProducts;  // All in memory at once
```

**Impact:**
- Product list: 50K items = 50-100MB
- Large products with variants: 200MB+
- Sync runs every 60 minutes

---

## Fixes to Apply

### Priority 1 (Critical - Apply Immediately)

#### Fix 1: KPI Report - Database Aggregation
**File:** `ReportsController.cs` lines 265-310

Move from LINQ to object to LINQ to database:
```csharp
// Use database aggregation
var kpis = await _context.Transactions
    .Where(t => t.CustomerId == customerId && t.TransactionDate >= last30Days)
    .GroupBy(t => 1)  // Single group for aggregation
    .Select(g => new
    {
        TotalTransactions = g.Count(),
        TotalQuantity = g.Sum(t => Math.Abs(t.Quantity)),
        ActiveUsers = g.Select(t => t.User).Distinct().Count(),
        Picks = g.Count(t => t.TransactionType == "Pick")
    })
    .FirstOrDefaultAsync();
```

#### Fix 2: Aging Inventory - Pagination Only
**File:** `ReportsController.cs` lines 440-520

Load ONLY current inventory state, not all historical transactions:
```csharp
// Get ONLY the most recent transaction per (SKU, LocationId)
var currentInventory = await _context.Transactions
    .AsNoTracking()
    .Where(t => t.CustomerId == customerId)
    .GroupBy(t => new { t.Sku, t.LocationId })
    .Select(g => new
    {
        g.Key.Sku,
        g.Key.LocationId,
        CurrentQuantity = g.OrderByDescending(t => t.TransactionDate)
            .FirstOrDefault().QuantityAfter,
        LastTransactionDate = g.Max(t => t.TransactionDate)
    })
    .ToListAsync();

// Calculate aging in database using computed columns or SQL window functions
```

#### Fix 3: Admin Controller - Connection Cleanup
**File:** `AdminController.cs` lines 403-450

```csharp
[HttpGet("database-specs")]
public async Task<IActionResult> GetDatabaseSpecs()
{
    try
    {
        var connectionString = _context.Database.GetConnectionString();
        var databaseName = ExtractDatabaseName(connectionString);
        
        using (var connection = _context.Database.GetDbConnection())
        {
            await connection.OpenAsync();
            
            using (var dbSizeCommand = connection.CreateCommand())
            {
                dbSizeCommand.CommandText = $@"
                    SELECT 
                        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS DatabaseSizeMB,
                        SUM(data_length + index_length) AS DatabaseSizeBytes
                    FROM information_schema.tables 
                    WHERE table_schema = '{databaseName}'";
                
                using (var reader = await dbSizeCommand.ExecuteReaderAsync())
                {
                    if (await reader.ReadAsync())
                    {
                        // Process results
                    }
                }
            }
        }  // Connection properly disposed
    }
    catch (Exception ex) { ... }
}
```

#### Fix 4: Demo Data Service - Limit Batch Size
**File:** `DemoDataRefreshService.cs` line 160+

```csharp
// Reduce batch sizes and insert in chunks
private const int BATCH_SIZE = 1000;  // Instead of 10K+

private async Task InsertTransactionsBatchAsync(ApplicationDbContext context, List<Transaction> transactions)
{
    for (int i = 0; i < transactions.Count; i += BATCH_SIZE)
    {
        var batch = transactions.Skip(i).Take(BATCH_SIZE).ToList();
        context.Transactions.AddRange(batch);
        await context.SaveChangesAsync();
        
        // Allow GC to collect completed batch
        batch.Clear();
    }
}
```

#### Fix 5: SkuVault API Client - Stream/Yield Results
**File:** `SkuVaultApiClient.cs` lines 320-370

```csharp
public async IAsyncEnumerable<List<SkuVaultProductDto>> GetProductsAsyncStreaming(
    string tenantToken, string userToken)
{
    int pageNumber = 0;
    const int pageSize = 5000;
    
    while (true)
    {
        var body = new { TenantToken = tenantToken, UserToken = userToken, 
                         PageNumber = pageNumber, PageSize = pageSize };
        
        var response = await _httpClient.PostAsJsonAsync("...", body);
        var pageData = await response.Content.ReadAsAsync<List<SkuVaultProductDto>>();
        
        if (pageData?.Count == 0) break;
        
        yield return pageData;  // Return one page at a time
        pageNumber++;
    }
}
```

---

### Priority 2 (Recommended - Apply This Sprint)

1. **Add `.AsNoTracking()` to ALL read-only queries**
   - Reduces EF Core tracking overhead by 30-40%

2. **Implement paging for large result sets**
   - Reports should paginate results instead of returning all

3. **Add memory caching with size limits**
   - `MemoryCache` with `SizeLimit` set in options

4. **Enable GC.Collect() between bulk operations**
   - After large sync operations completes

---

### Priority 3 (Long-term)

1. **Migrate aging inventory to SQL View**
   - Pre-calculate FIFO aging in database
   - Update nightly instead of on-request

2. **Implement event-based caching invalidation**
   - Reduce unnecessary data reloading

3. **Add memory monitoring & alerting**
   - Alert when heap usage > 500MB

---

## Testing Changes

After applying fixes, monitor:

```powershell
# Check memory usage on EC2
watch -n 1 'free -h | grep Mem'

# Check .NET process memory
ps aux | grep dotnet
ps -eo pid,vsz,rss,comm | grep SkuVaultSaaS.Api
```

Expected improvements:
- **Before:** 1.5GB + during syncs, OOM at 2GB
- **After:** 300-400MB baseline, max 800MB during peak loads
