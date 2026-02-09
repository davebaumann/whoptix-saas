# SkuVault API Response Export - Comparison Tool

## Overview

This endpoint exports the **raw SkuVault API response** to CSV so you can compare it directly to what's in your database. This helps identify:

- ✅ If SkuVault API is returning data correctly
- ✅ If data is being lost/corrupted during sync to database
- ✅ If there are discrepancies between API and database

## Endpoint

```
GET /api/admin/export-skuvault-api-csv
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customerId` | int | ✅ Yes | Customer ID |
| `transactionFrom` | DateTime | ✅ Yes | Start date (ISO 8601: `2026-01-15`) |
| `transactionTo` | DateTime | ✅ Yes | End date (ISO 8601: `2026-01-19`) |

## Authentication

- **Required**: Admin role
- **Type**: JWT Bearer token

## Usage

### From Browser
```
https://yourdomain.com/api/admin/export-skuvault-api-csv?customerId=2&transactionFrom=2026-01-15&transactionTo=2026-01-19
```

### cURL
```bash
curl "https://yourdomain.com/api/admin/export-skuvault-api-csv?customerId=2&transactionFrom=2026-01-15&transactionTo=2026-01-19" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o skuvault-api-response.csv
```

### PowerShell
```powershell
$headers = @{
    "Authorization" = "Bearer $jwtToken"
}
Invoke-WebRequest -Uri "https://yourdomain.com/api/admin/export-skuvault-api-csv?customerId=2&transactionFrom=2026-01-15&transactionTo=2026-01-19" `
  -Headers $headers `
  -OutFile "skuvault-api-response.csv"
```

## CSV Output Format

```
Sku,Location,TransactionType,Quantity,TransactionDate,User,ContextId
SONARTSGBLACKGREYSTD,null,Pick,7,2026-01-16T17:23:43.681Z,Chelsee Dahozy,null
SONARTSGBLACKGREYSTD,null,Pick,7,2026-01-16T16:19:36.970Z,Jayden Green,null
...
```

### Columns

- **Sku**: Product SKU
- **Location**: Warehouse/location code
- **TransactionType**: Type of transaction (Pick, Add, Remove, Return, etc.)
- **Quantity**: Number of units
- **TransactionDate**: When transaction occurred
- **User**: Person who performed it
- **ContextId**: SkuVault context identifier

## Comparison Workflow

### Step 1: Export SkuVault API Response
```
GET /api/admin/export-skuvault-api-csv?customerId=2&transactionFrom=2026-01-15&transactionTo=2026-01-19
Output: skuvault-api-response.csv (e.g., 5,000 records)
```

### Step 2: Export Your Database
```
GET /api/admin/export-transactions-csv?customerId=2&transactionFrom=2026-01-15&transactionTo=2026-01-19
Output: transactions.csv (e.g., 4,800 records)
```

### Step 3: Compare

**Check 1: Record Counts**
```
API Response: 5,000 records
Database: 4,800 records
Difference: 200 records MISSING from database
```

**Check 2: Per-SKU Comparison**
```
Excel Formula: =COUNTIFS('API'!A:A, 'DB'!A2)
For each SKU in database, count matches in API
```

**Check 3: Data Integrity**
- API has SKU with 7 units on 2026-01-16
- Database has same SKU with 5 units on 2026-01-16
- Indicates data corruption during sync

## Troubleshooting

### "0 transactions returned from SkuVault API"
- Verify date range has transactions in SkuVault
- Check SkuVault connectivity
- Verify tokens are not expired

### File is smaller than expected
- SkuVault might be rate-limiting
- Try smaller date range (1-7 days instead of 90)
- Check for API errors in application logs

### Data doesn't match database
- **Fewer records in DB than API**: Sync is dropping data
  - Run sync again and re-export
  - Check for SKU mapping issues (Products table)
  
- **More records in DB than API**: Data corruption
  - Check for duplicate transactions
  - Verify QuantityBefore/QuantityAfter chains
  
- **Same count, different quantities**: Calculation issue
  - Check aging report fix (QuantityAfter usage)
  - Verify transaction types are correct

## Quick Diagnostic Script

Run this SQL to quickly compare counts:

```sql
-- Export counts by SKU from database
SELECT Sku, COUNT(*) as DbCount FROM Transactions 
WHERE CustomerId = 2 AND TransactionDate BETWEEN '2026-01-15' AND '2026-01-19'
GROUP BY Sku
ORDER BY DbCount DESC;
```

Then compare row counts with the API CSV export.

## Examples

### Example 1: Verify Recent 3 Days
```
API:  https://yourdomain.com/api/admin/export-skuvault-api-csv?customerId=2&transactionFrom=2026-01-17&transactionTo=2026-01-19
DB:   https://yourdomain.com/api/admin/export-transactions-csv?customerId=2&transactionFrom=2026-01-17&transactionTo=2026-01-19

Compare record counts - should match or DB slightly fewer (accounting for processing delays)
```

### Example 2: Find Data Loss Window
```
Export API for: 2026-01-01 to 2026-01-31 (5,000 records)
Export DB for: 2026-01-01 to 2026-01-31 (4,500 records)

Bisect: Test 2026-01-01 to 2026-01-15
If 2,500 in API and 2,500 in DB, data loss is in 2026-01-16 to 2026-01-31
Continue bisecting to find exact window
```

## Performance Notes

- Large date ranges (>30 days) may take longer
- SkuVault API has rate limits - may delay response
- CSV file size is approximately 0.5-2 MB per 1,000 records

## Security

- ✅ Admin role required
- ✅ JWT authentication required
- ✅ All exports logged with admin email and timestamp
- ✅ Tokens are decrypted safely server-side

---

**Use Case**: Verify data integrity between SkuVault API and local database
**Frequency**: Run after major syncs or when investigating data discrepancies
**Data Sensitivity**: Contains transaction history - use admin password only
