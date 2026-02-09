# Sync Data Integrity Analysis - Key Findings

## Summary of Issues Found

### 1. **QuantityAfter Field Inconsistencies**
The `QuantityAfter` values show unexplained jumps between sequential transactions:
- Transaction A ends with `QuantityAfter = 147`
- Transaction B starts with `QuantityBefore = 1647` (gap of 1500 units)
- **Root Cause**: Likely transactions being inserted out of order, or the running totals being recalculated incorrectly

**Impact on Aging Report**: Using `QuantityAfter` from the most recent transaction will show wrong inventory levels

### 2. **Transactions Not Linked to InventoryLevels**
- Customer 2 has 8,714 unique SKUs in Transactions
- Only 1,056 InventoryLevel records exist (12.1% coverage)
- **Root Cause**: API's `getInventoryByLocation` endpoint only returns SKUs with current stock. SKUs with zero quantity are omitted.

**Impact**: Aging report doesn't show ~88% of the historical inventory

### 3. **Date Range Handling in API Calls**
The `GetInventoryMovementsAsync` method:
- ✅ Supports date range filtering
- ✅ Has chunking logic (6-day windows)
- ❌ **But**: No pagination - assumes all records fit in response
- ❌ Could silently fail on large date ranges without indication

## Immediate Actions Required

### Step 1: Validate Data Integrity
Run `sync-validation-queries.sql` to check:
```sql
-- Most critical first: Are QuantityBefore/QuantityAfter chains consistent?
-- Look for transactions where:
--   PreviousQtyAfter <> CurrentQtyBefore  (data out of order)
--   QuantityBefore + Quantity <> QuantityAfter  (calculation error)
```

### Step 2: Test Manual Sync Endpoint
Once implemented, use the endpoint to test specific date ranges:
```
POST /api/sync/manual-sync-transactions?customerId=2&startDate=2025-10-01&endDate=2025-10-15
```

This will show exactly how many records are fetched for a known date range, revealing if data is being silently dropped.

### Step 3: Check API Response Limits
The SkuVault API may have maximum response sizes:
- If date range returns 10,000+ records, API might truncate without error
- Current code has no indication if response was incomplete
- Need to add checks: "Did API return all records for this range?"

## Recommended Fixes

### Fix 1: Add Response Completeness Check to GetInventoryMovementsAsync
```csharp
// After parsing response, log:
_logger?.LogInformation("API returned {Count} transactions for range {From} to {To}. " +
    "If significantly lower than expected, response may have been truncated.", 
    transactions.Count, fromDate, toDate);
```

### Fix 2: Implement Pagination for Transactions
If API supports pagination (need to confirm with SkuVault):
```csharp
int pageNumber = 0;
while (true) {
    var page = await GetPage(pageNumber);
    if (page.Count < pageSize) break;
    pageNumber++;
}
```

### Fix 3: Fix Aging Report to Account for Missing Data
Currently using `QuantityAfter` from most recent transaction, but:
- ✅ This is correct for getting actual current qty
- ✅ Aging buckets use FIFO logic (fixed)
- ❌ But 88% of SKUs have no data!

Should fall back to using Transaction history directly for SKUs without InventoryLevels

### Fix 4: Add Data Reconciliation
After each sync, log:
- Expected SKU count (from Products table)
- Actual SKUs synced (from API)
- SKUs with zero inventory (not in API response)
- Discrepancy flag if > 5%

## Testing Plan

### Test Case 1: Single SKU Full History
```
1. Pick a SKU (e.g., SONARTSGBLACKGREYSTD)
2. Run: SELECT * FROM Transactions WHERE Sku = 'SONARTSGBLACKGREYSTD' ORDER BY TransactionDate
3. Check:
   - Are all transactions chronological?
   - Does each QuantityAfter match next QuantityBefore?
   - Is final QuantityAfter = expected current inventory?
```

### Test Case 2: Date Range Sync
```
1. Run: DELETE FROM Transactions WHERE CustomerId = 2 AND TransactionDate >= '2026-01-10'
2. Call: POST /api/sync/manual-sync-transactions?customerId=2&startDate=2026-01-10&endDate=2026-01-18
3. Check: Does it restore the same number of transactions?
4. Verify: SELECT COUNT(*) should match backup count
```

### Test Case 3: Initial Sync Simulation
```
1. Backup all data for new customer
2. Clear all Transactions/InventoryLevels
3. Run full sync with 90-day date range
4. Compare: Should match backup exactly
```

## Files to Review

1. **SkuVaultApiClient.cs** - `GetInventoryMovementsAsync()` (line 358)
   - Check if API supports pagination
   - Add logging for response size

2. **SkuVaultSyncService.cs** - `SyncTransactionsAsync()` (line 603)
   - Verify 6-day chunking is working correctly
   - Add logging for chunk processing

3. **ReportsController.cs** - `GetAgingInventoryReport()` (line 430+)
   - Now uses QuantityAfter correctly ✓
   - Uses FIFO aging logic ✓
   - Still missing 88% of SKUs ✗

## SQL Debugging Commands

### Check for out-of-order transactions:
```sql
SELECT * FROM Transactions 
WHERE Sku = 'SONARTSGBLACKGREYSTD' 
ORDER BY TransactionDate DESC 
LIMIT 20;
-- If QuantityAfter decreases with older dates, they're out of order
```

### Find all quantity inconsistencies:
```sql
WITH Chain AS (
  SELECT Sku, TransactionDate, QuantityBefore, QuantityAfter,
    LAG(QuantityAfter) OVER (PARTITION BY Sku ORDER BY TransactionDate) as PrevQtyAfter
  FROM Transactions WHERE CustomerId = 2
)
SELECT * FROM Chain 
WHERE PrevQtyAfter IS NOT NULL AND PrevQtyAfter <> QuantityBefore;
```

---

**Status**: 🔴 Critical - Data integrity issues that directly impact aging report accuracy
**Owner**: Infrastructure/Data team
**Priority**: 1 - Blocks accurate reporting
