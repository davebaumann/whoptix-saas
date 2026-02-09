# Admin CSV Export Endpoint - Usage Guide

## Endpoint

```
GET /api/admin/export-transactions-csv
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customerId` | int | ✅ Yes | Customer ID to export transactions for |
| `transactionFrom` | DateTime | ✅ Yes | Start date (ISO 8601 format: `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss`) |
| `transactionTo` | DateTime | ✅ Yes | End date (ISO 8601 format: `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss`) |

## Authentication

- **Required**: Admin role
- **Type**: JWT Bearer token (automatic from browser when logged in)

## Usage Examples

### Example 1: Export from browser (logged in as admin)
```
https://yourdomain.com/api/admin/export-transactions-csv?customerId=2&transactionFrom=2026-01-01&transactionTo=2026-01-19
```

### Example 2: Using curl
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "https://yourdomain.com/api/admin/export-transactions-csv?customerId=2&transactionFrom=2025-10-01&transactionTo=2025-10-31"
```

### Example 3: Using PowerShell
```powershell
$headers = @{
    "Authorization" = "Bearer $jwtToken"
}
Invoke-WebRequest -Uri "https://yourdomain.com/api/admin/export-transactions-csv?customerId=2&transactionFrom=2025-10-01&transactionTo=2025-10-31" `
  -Headers $headers `
  -OutFile "transactions.csv"
```

## CSV Output Format

The exported CSV file includes:

```
Id,Sku,TransactionType,Quantity,QuantityBefore,QuantityAfter,TransactionDate,User,ContextId,SkuVaultId,Location,CreatedAt
1,SONARTSGBLACKGREYSTD,Pick,7,71,64,2026-01-16 17:23:43.681,Chelsee Dahozy,null,SKU_20260116172343_ChelseeDahozy_null_7,null,2026-01-16 17:23:43.681
...
```

### Column Descriptions

- **Id**: Internal transaction ID in the database
- **Sku**: Product SKU code
- **TransactionType**: Type of transaction (Pick, Add, Remove, Return, etc.)
- **Quantity**: Number of units in the transaction
- **QuantityBefore**: Running total BEFORE this transaction
- **QuantityAfter**: Running total AFTER this transaction
- **TransactionDate**: When the transaction occurred
- **User**: Person who performed the transaction
- **ContextId**: SkuVault context/location identifier
- **SkuVaultId**: Unique ID from SkuVault API
- **Location**: Warehouse/location code
- **CreatedAt**: When record was synced to database

## Data Validation Checks You Can Perform

### Check 1: Transaction Chain Integrity
Look for rows where `QuantityAfter` from one row doesn't match `QuantityBefore` of the next row:

```
Row 1: Qty=7,   Before=71,   After=64  ✓
Row 2: Qty=7,   Before=65,   After=58  ✗ (Expected Before=64, got 65)
```

This indicates **transactions are out of order or data corruption**.

### Check 2: Calculation Verification
For each row: `QuantityBefore + Quantity = QuantityAfter`

```
71 + (-7) = 64  ✓
78 + (-7) = 71  ✓
79 + (-1) = 78  ✓
```

### Check 3: SKU Gaps
Use Excel/Google Sheets to filter by SKU and check:
- Are there unexpected date gaps?
- Do quantities ever go negative unexpectedly?
- Are there duplicate transactions on same timestamp?

### Check 4: Transaction Type Distribution
Summary row at end of CSV shows counts by type:

```
SUMMARY
Pick,1250
Add,143
Remove,5
Return,12
```

## Troubleshooting

### Error: "Customer not found"
- Verify the `customerId` parameter is correct
- Check customer exists in database

### Error: "transactionFrom must be before transactionTo"
- Ensure start date is earlier than end date

### Empty result / "No transactions found"
- Date range may have no transactions for this customer
- Verify transactions exist: Query `SELECT COUNT(*) FROM Transactions WHERE CustomerId = 2 AND TransactionDate BETWEEN '2026-01-01' AND '2026-01-31'`

### File too large
- Use a smaller date range to reduce records
- Reduce from 90 days to 7 days at a time

## Testing Workflow

1. **Export a small date range first** (1-7 days)
   ```
   ?customerId=2&transactionFrom=2026-01-15&transactionTo=2026-01-19
   ```

2. **Check for quantity chain breaks**
   - Sort by TransactionDate
   - Verify QuantityAfter chains to QuantityBefore

3. **Export same date range again** (next day)
   - Should get identical results
   - If different: data is still changing (sync in progress)

4. **Export full historical range** (when satisfied small samples are clean)
   ```
   ?customerId=2&transactionFrom=2025-10-01&transactionTo=2026-01-19
   ```

5. **Compare to SkuVault directly**
   - Log into SkuVault
   - Check a specific SKU's transaction history
   - Verify quantities match your CSV export

## Logging

All exports are logged with:
- Admin user email who ran export
- Customer ID
- Date range
- Number of records
- File size in bytes

Check application logs if you need to audit exports.

---

**Note**: This endpoint is Admin-only and requires a valid JWT bearer token. It cannot be accessed by regular users.
