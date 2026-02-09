# Purchase Order Receives History Implementation

## Summary
Added complete support for syncing PO receives history from SkuVault API, enabling item-level lead time analysis.

## Files Created

### 1. Core Models
- **`PurchaseOrderReceive.cs`** - Entity for tracking individual item receipts
- **`PurchaseOrderReceiveCorrection.cs`** - Entity for tracking receipt quantity corrections

### 2. API DTOs (in `ISkuVaultApiClient.cs`)
- **`SkuVaultReceiveDto`** - API response DTO for receives
- **`SkuVaultReceiveCorrectionDto`** - API response DTO for corrections
- **`SkuVaultReceivesHistoryDto`** - Container for both receives and corrections

## Files Modified

### 1. **ISkuVaultApiClient.cs**
- Added `GetReceivesHistoryAsync()` method signature
- Added three new DTOs for receives history

### 2. **SkuVaultApiClient.cs**
- Implemented `GetReceivesHistoryAsync()` method
  - Calls `/purchaseorders/getReceivesHistory` endpoint
  - Supports date filtering (90 days default)
  - Supports PO number filtering
  - Handles pagination with page size 10000
  - Proper error handling and logging

### 3. **ISkuVaultSyncService.cs**
- Added `SyncReceivesHistoryAsync()` interface method

### 4. **SkuVaultSyncService.cs**
- Added `SyncReceivesHistoryAsync()` implementation
  - Calls API and processes receives
  - Processes corrections
  - Logs statistics for both
- Added `UpdateReceivesInDatabase()` method
  - Upserts PurchaseOrderReceive records
  - Tracks add/update counts
- Added `UpdateReceiveCorrectionsInDatabase()` method
  - Upserts PurchaseOrderReceiveCorrection records
  - Tracks add/update counts
- Integrated sync call into main `SyncCustomerDataAsync()` flow

### 5. **ApplicationDbContext.cs**
- Added `DbSet<PurchaseOrderReceive>` and `DbSet<PurchaseOrderReceiveCorrection>`
- Added EF Core entity configuration with:
  - Foreign keys to Customer (cascade delete)
  - Indexes on CustomerId, PONumber, SKU, receipt dates
  - Unique constraint on CustomerId+PONumber (for receives)

### 6. **Migration File**
- **`20260208_AddPurchaseOrderReceivesHistoryTables.cs`**
  - Creates `PurchaseOrderReceives` table
  - Creates `PurchaseOrderReceiveCorrections` table
  - Adds all necessary indexes for performance

## Database Schema

### PurchaseOrderReceives Table
```
- Id (PK)
- CustomerId (FK) → Customers
- PONumber
- PartNumber
- SKU
- Code
- Quantity
- Quantity3PL
- QuantityToLocation
- ReceiptDate
- ReceivedDate
- Location
- Warehouse
- Username
- CreatedDateUtc
- UpdatedDateUtc

UNIQUE: (CustomerId, PONumber, PartNumber, ReceiptDate)
INDEXES: ReceiptDate, SKU, (CustomerId, PONumber)
```

### PurchaseOrderReceiveCorrections Table
```
- Id (PK)
- CustomerId (FK) → Customers
- PONumber
- PartNumber
- SKU
- Code
- OldQuantity
- NewQuantity
- OldQuantity3PL
- NewQuantity3PL
- CorrectedDate
- ReceivedDate
- Username
- CreatedDateUtc
- UpdatedDateUtc

INDEXES: CorrectedDate, SKU, (CustomerId, PONumber)
```

## How to Deploy

### Step 1: Run Migration
```bash
cd backend/SkuVaultSaaS.Api
dotnet ef database update
```

### Step 2: Sync Data
The receives history will now be synced automatically:
- During full customer sync (calls `SyncReceivesHistoryAsync()`)
- Defaults to last 90 days of data
- Runs after PO sync in the sync pipeline

### Step 3: Verify
Check the database:
```sql
SELECT COUNT(*) FROM PurchaseOrderReceives;
SELECT COUNT(*) FROM PurchaseOrderReceiveCorrections;
```

## Analytics Enabled

You can now calculate **item-level lead times**:

```sql
-- Lead time by SKU
SELECT 
    pr.SKU,
    pr.PartNumber,
    po.SupplierName,
    COUNT(*) as ReceiveCount,
    AVG(DATEDIFF(day, po.OrderDate, pr.ReceivedDate)) as AvgLeadTimeDays,
    MIN(DATEDIFF(day, po.OrderDate, pr.ReceivedDate)) as MinLeadTimeDays,
    MAX(DATEDIFF(day, po.OrderDate, pr.ReceivedDate)) as MaxLeadTimeDays
FROM PurchaseOrderReceives pr
JOIN PurchaseOrders po ON pr.PONumber = po.PoNumber AND pr.CustomerId = po.CustomerId
WHERE pr.CustomerId = ?
GROUP BY pr.SKU, pr.PartNumber, po.SupplierName
ORDER BY AvgLeadTimeDays DESC;

-- Lead time by Vendor by SKU
SELECT 
    po.SupplierName,
    pr.SKU,
    COUNT(*) as ReceiveCount,
    AVG(DATEDIFF(day, po.OrderDate, pr.ReceivedDate)) as AvgLeadTimeDays
FROM PurchaseOrderReceives pr
JOIN PurchaseOrders po ON pr.PONumber = po.PoNumber AND pr.CustomerId = po.CustomerId
WHERE pr.CustomerId = ?
GROUP BY po.SupplierName, pr.SKU
ORDER BY po.SupplierName, AvgLeadTimeDays DESC;
```

## Next Steps

1. **Update Jupyter Notebook** - Add cells to query receives history
2. **Create Reports** - Build lead time reports by SKU, vendor, product
3. **Add Admin Controllers** - Create API endpoints for receives data export
4. **Performance Monitoring** - Monitor sync times as data grows
