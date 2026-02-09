# Transaction Data Export & Verification System

## Overview

You now have a complete admin tool to export and verify transaction data integrity. This will help identify if SKUs are being corrupted during sync or if data is missing.

## What Was Added

### 1. Admin API Endpoint
**File**: `AdminController.cs` (new method: `ExportTransactionsCsv`)

**Endpoint**: `GET /api/admin/export-transactions-csv`

**Parameters**:
- `customerId` (required): Customer to export
- `transactionFrom` (required): Start date (ISO 8601)
- `transactionTo` (required): End date (ISO 8601)

**Returns**: CSV file download with all transaction data

### 2. Admin HTML UI
**File**: `admin-export.html`

**Features**:
- User-friendly form with date range picker
- Quick buttons (Last 7/30/90 days)
- Real-time validation
- Download progress indicator
- Error messages

**Access**: 
```
https://yourdomain.com/admin-export.html
```

### 3. Usage Documentation
**File**: `ADMIN-CSV-EXPORT-GUIDE.md`

## How to Use

### Option A: From Browser (Easiest)
1. Log in as admin to your application
2. Navigate to: `https://yourdomain.com/admin-export.html`
3. Enter:
   - Customer ID (e.g., 2)
   - Date range
4. Click "Export to CSV"
5. File downloads automatically

### Option B: From Command Line
```bash
curl "https://yourdomain.com/api/admin/export-transactions-csv?customerId=2&transactionFrom=2026-01-15T00:00:00Z&transactionTo=2026-01-19T23:59:59Z" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o transactions.csv
```

### Option C: PowerShell
```powershell
$headers = @{
    "Authorization" = "Bearer $(Get-Content token.txt)"
}
Invoke-WebRequest `
  -Uri "https://yourdomain.com/api/admin/export-transactions-csv?customerId=2&transactionFrom=2026-01-15&transactionTo=2026-01-19" `
  -Headers $headers `
  -OutFile "transactions.csv"
```

## CSV Output Format

Each transaction includes:

| Field | Example | Purpose |
|-------|---------|---------|
| Id | 12345 | Database ID |
| Sku | SONARTSGBLACKGREYSTD | Product code |
| TransactionType | Pick | Type: Pick, Add, Remove, Return |
| Quantity | 7 | Units in transaction |
| QuantityBefore | 71 | Running total before |
| QuantityAfter | 64 | Running total after |
| TransactionDate | 2026-01-16 17:23:43 | When it happened |
| User | Chelsee Dahozy | Who performed it |
| ContextId | null | SkuVault context |
| SkuVaultId | SKU_20260116... | API ID |
| Location | null | Warehouse location |
| CreatedAt | 2026-01-16 17:23:43 | When synced |

## Data Integrity Checks

### Check 1: Quantity Chain Integrity
The most critical check - each row's `QuantityAfter` should match the next row's `QuantityBefore`:

**Good Example:**
```
Row 1: Before=71, Qty=-7, After=64
Row 2: Before=64, Qty=-7, After=57  ← QuantityBefore matches previous After ✓
Row 3: Before=57, Qty=-1, After=56
```

**Bad Example (Data Corruption):**
```
Row 1: Before=71, Qty=-7, After=64
Row 2: Before=65, Qty=-7, After=58  ← QuantityBefore should be 64, not 65 ✗
```

### Check 2: Calculation Verification
For each transaction: `QuantityBefore ± Quantity = QuantityAfter`

In Excel/Google Sheets add a column:
```excel
=IF(D2+C2=E2,"OK","ERROR")
```

Where:
- C = Quantity
- D = QuantityBefore
- E = QuantityAfter

### Check 3: Transaction Type Validation
Verify that:
- **Add/Return**: Quantities are positive (increase inventory)
- **Pick/Remove**: Quantities are positive but decrease inventory

### Check 4: Date Order
Sort by `TransactionDate` - should show oldest first:
- If you see dates jump around, transactions are out of order
- Indicates sync issue or data insertion problem

## Investigation Workflow

### Step 1: Test a Single SKU (Small Sample)
```
Export: 2026-01-15 to 2026-01-19 (5 days)
Customer: 2
Look for: SONARTSGBLACKGREYSTD
```

**Actions**:
1. Sort by SKU filter
2. Check all rows for this SKU
3. Verify quantity chain intact
4. Check no duplicate timestamps

### Step 2: Check for Quantity Breaks
```
Excel Formula: =IF(ROW()>2,IF(OFFSET(E1,0,0)=D2,"OK","BREAK"),"")
```

This highlights any row where previous After ≠ current Before

### Step 3: Export Same Date Range Twice
```
Export 1: 2026-01-15 to 2026-01-19
Wait 1 hour
Export 2: 2026-01-15 to 2026-01-19
```

**Compare**:
- Row count should be identical
- Transaction dates and quantities should be identical
- If different → data is still being modified/synced

### Step 4: Validate Against SkuVault
1. Log into SkuVault directly
2. Find same SKU
3. Check transaction history
4. Verify quantities match your CSV

### Step 5: Full Historical Export (When Confident)
```
Export: 2025-10-01 to 2026-01-19 (90 days)
Customer: 2
Verify count matches backup
```

## Common Issues to Look For

### Issue 1: Out of Order Transactions
**Symptom**: Dates not in chronological order, QuantityAfter decreases with older dates

**Cause**: Transactions inserted out of order during sync

**Fix**: Requires database rebuild

### Issue 2: Quantity Gaps
**Symptom**: QuantityBefore doesn't match previous QuantityAfter

**Cause**: Missing transactions or data inserted incorrectly

**Fix**: Re-sync affected date range

### Issue 3: Duplicate Transactions
**Symptom**: Same SKU, same timestamp, same quantity appears twice

**Cause**: Sync ran twice, didn't check for duplicates

**Fix**: Manual cleanup + improve duplicate detection

### Issue 4: SKU Missing Entirely
**Symptom**: Export shows no transactions for SKU that should have them

**Cause**: Sync never ran for that SKU or Product doesn't exist

**Fix**: Verify Product exists, re-run sync

## Testing Production Data

**⚠️ Important**: Always start with small date ranges before exporting large volumes

**Recommended Sequence**:

1. **Day 1**: Export 3-day range (yesterday to today)
2. **Day 2**: Export 7-day range (last week)
3. **Day 3**: Export 30-day range (last month)
4. **Day 4**: Export 90-day range if all previous checks pass
5. **Day 5**: Export full history if production use needed

## Files Modified

### New Files
- `admin-export.html` - Admin UI
- `ADMIN-CSV-EXPORT-GUIDE.md` - User guide

### Modified Files
- `AdminController.cs` - Added `ExportTransactionsCsv()` method

## Security

✅ **Admin Role Required**: Only users with "Admin" role can use this endpoint

✅ **JWT Authentication**: Requires valid bearer token

✅ **Audit Logged**: All exports logged with:
- Admin user email
- Customer ID
- Date range
- Record count
- File size

## Troubleshooting

### "No transactions found"
- Verify transactions exist: `SELECT COUNT(*) FROM Transactions WHERE CustomerId=2 AND TransactionDate BETWEEN '2026-01-15' AND '2026-01-19'`
- Try different date range
- Check customer ID is correct

### "Customer not found"
- Verify customer ID exists: `SELECT Id, Name FROM Customers WHERE Id=2`
- Use correct ID

### File download doesn't start
- Check browser console for errors
- Verify you're logged in as admin
- Try smaller date range

### File is empty or corrupted
- Verify no special characters in SKU that break CSV
- Try different date range
- Check file size is > 0

## Next Steps

1. **Run first export** with 3-day range
2. **Check quantity chain** for breaks
3. **Identify problem date ranges** if any
4. **Re-sync** problem ranges if needed
5. **Run validation SQL** to compare API responses
6. **Document findings** for data integrity report

---

**Endpoint URL**: `/api/admin/export-transactions-csv`
**Admin UI**: `/admin-export.html`
**Authentication**: Admin role + JWT token
**Rate Limit**: None (admin only)
