# Quick Reference: Transaction Export & Verification

## 🚀 Quick Start

1. **Admin UI** → Visit: `https://yourdomain.com/admin-export.html`
2. **Enter**: Customer ID + Date Range
3. **Click**: "Export to CSV"
4. **Verify**: Open CSV and check quantity chain

## ✅ What to Check in CSV

### Primary Check: Quantity Chain
```
For each row where previous row exists:
  previous_row.QuantityAfter should equal current_row.QuantityBefore
  
Excel formula: =IF(E1=D2,"GOOD","BREAK")
```

### Secondary Check: Math
```
For each row:
  QuantityBefore + Quantity = QuantityAfter
  
Excel formula: =IF(D2+C2=E2,"OK","ERROR")
```

### Tertiary Check: Order
```
All rows should be in chronological order by TransactionDate
Sort by TransactionDate ascending to verify
```

## 🔧 API Endpoint

```
GET /api/admin/export-transactions-csv?customerId=2&transactionFrom=2026-01-15&transactionTo=2026-01-19
```

Returns: CSV file download

**Headers**: `Authorization: Bearer {jwt_token}`

**Status Codes**:
- 200: Success - file downloads
- 400: Bad request (invalid dates, params)
- 404: Customer not found

## 📊 CSV Columns

```
Id | Sku | TransactionType | Quantity | QuantityBefore | QuantityAfter | TransactionDate | User | ContextId | SkuVaultId | Location | CreatedAt
```

**Key Fields**:
- `QuantityBefore`: Running total BEFORE transaction
- `QuantityAfter`: Running total AFTER transaction
- `TransactionDate`: When transaction happened
- `CreatedAt`: When synced to database

## 🐛 Common Issues

| Issue | Sign | Fix |
|-------|------|-----|
| Out of Order | Dates jump around | Re-sync affected period |
| Missing Txns | Qty jumps don't match | Check for sync gaps |
| Corrupted Data | Before≠Previous After | DB rebuild needed |
| Duplicate Txns | Same timestamp/qty twice | Manual cleanup |

## 📋 Testing Sequence

1. Export **3 days** (recent data)
2. Check for **quantity breaks**
3. Export **same 3 days** again next day
4. Compare - should be **identical**
5. If OK, export **30 days**
6. If OK, export **90 days**
7. If OK, export **full history**

## 🎯 Commands

### Browser (Easiest)
```
https://yourdomain.com/admin-export.html
```

### cURL
```bash
curl "https://yourdomain.com/api/admin/export-transactions-csv?customerId=2&transactionFrom=2026-01-15&transactionTo=2026-01-19" \
  -H "Authorization: Bearer TOKEN" \
  -o transactions.csv
```

### PowerShell
```powershell
$headers = @{ "Authorization" = "Bearer $token" }
Invoke-WebRequest -Uri "https://yourdomain.com/api/admin/export-transactions-csv?customerId=2&transactionFrom=2026-01-15&transactionTo=2026-01-19" `
  -Headers $headers `
  -OutFile "transactions.csv"
```

## ⚠️ Important Notes

- **Admin role required** - Only admin users can export
- **Small ranges first** - Test 3-7 days before 90 days
- **Compare twice** - Export same range two days apart, should match
- **Check dates** - All timestamps should be chronological
- **CSV escaping** - Fields with commas/quotes are properly escaped

## 📈 Data Validation SQL

```sql
-- Check if data exists for date range
SELECT COUNT(*) FROM Transactions 
WHERE CustomerId = 2 
  AND TransactionDate BETWEEN '2026-01-15' AND '2026-01-19';

-- Find quantity breaks
WITH Chain AS (
  SELECT Sku, TransactionDate, QuantityBefore, QuantityAfter,
    LAG(QuantityAfter) OVER (PARTITION BY Sku ORDER BY TransactionDate) as PrevAfter
  FROM Transactions 
  WHERE CustomerId = 2
)
SELECT * FROM Chain WHERE PrevAfter <> QuantityBefore AND PrevAfter IS NOT NULL;
```

## 📞 Support

**Endpoint not working?**
- Verify you're logged in as admin
- Check JWT token is valid
- Verify dates are in correct format (YYYY-MM-DD)

**Data looks wrong?**
- Compare to SkuVault directly
- Check for quantity breaks using Excel formula
- Export again to verify data is stable

**Need to debug?**
- Check application logs
- All exports are logged with admin email + timestamp
- Contact infrastructure team with customer ID + date range

---

**Version**: 1.0
**Status**: ✅ Ready for Production
**Auth**: Admin Role + JWT Bearer Token
