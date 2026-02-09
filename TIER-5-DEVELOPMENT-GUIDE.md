# Tier 5: Development/Testing Guide

## Overview

**Tier 5** is reserved for admins to test reports under development before rolling them out to paying customers.

### Tier Structure:
- **Tier 0**: Basic (reserved for future use)
- **Tier 1**: Free/Inventory only
- **Tier 2**: Standard
- **Tier 3**: Premium
- **Tier 4**: Enterprise
- **Tier 5**: Development/Testing (admin only)

---

## How to Use Tier 5

### Step 1: Create a Dev Test Customer

In your database, create a test customer with tier 5:

```sql
INSERT INTO Customers (Email, MembershipLevel, IsActive, TenantId, LastSyncedAt)
VALUES ('dev@example.com', 5, 1, 'dev-tenant', NOW());
```

Or via the frontend admin panel (if customer creation is available).

### Step 2: Configure the Dev Customer's SkuVault Connection

Set up this test customer with valid SkuVault credentials pointing to a test SkuVault account:
- Go to Admin → Customer Management
- Find the dev customer
- Add SkuVault email/password for test data access

### Step 3: Add New Report to Tier 5

Update `reportAccessConfig.json` or via the config UI:

```json
{
  "new-report-beta": 5
}
```

Or in `ReportAccessService.cs` default config:
```csharp
{ "new-report-beta", 5 }
```

### Step 4: Test the Report

1. **As Admin**: Impersonate the dev customer (tier 5)
   - Go to Admin → Customer Management
   - Click "View As" on the dev customer
   - You'll now see all tier 5 reports + customer's actual data

2. **Validate**: Check report logic, data accuracy, performance, UI

### Step 5: Promote to Production

When report is ready, update the tier:

```json
{
  "new-report-beta": 3  // Promote to Premium tier
}
```

All Premium customers now see the report on next login.

---

## Example Workflow

```
Day 1: Develop Picker Analytics Report
├─ Add to reportAccessConfig.json with tier: 5
├─ Impersonate dev customer
├─ See report with test data
└─ Test & iterate

Day 3: Report Ready
├─ Update tier: 5 → 3 (Premium)
├─ Deploy
└─ All Premium customers see it on login

Day 7: Upsell to Enterprise-only feature
└─ Update tier: 3 → 4 (Enterprise) if needed
```

---

## Benefits

✅ Real customer data for testing  
✅ Validate tier restrictions work correctly  
✅ Easy to promote when ready (just change tier number)  
✅ Admin impersonation sees exactly what customer sees  
✅ No special code logic needed  
✅ Can have multiple reports in development  

---

## SQL Queries

### Create dev customer:
```sql
INSERT INTO Customers (Email, MembershipLevel, IsActive, TenantId, LastSyncedAt)
VALUES ('dev@yourcompany.com', 5, 1, 'dev-tenant', NOW());
```

### Update dev customer tier:
```sql
UPDATE Customers SET MembershipLevel = 5 WHERE Email = 'dev@yourcompany.com';
```

### List all tier 5 customers (dev):
```sql
SELECT Id, Email, MembershipLevel FROM Customers WHERE MembershipLevel = 5;
```

### Find customer by tier:
```sql
SELECT Email, MembershipLevel FROM Customers WHERE MembershipLevel = 5 LIMIT 10;
```

---

## Notes

- Tier 5 should only be assigned to internal test accounts
- Customers will never see tier 5 (it's admin-only)
- Tier 0 is reserved for future "Basic" tier if needed
- To prevent accidental customer assignment, consider adding a validation:
  ```csharp
  if (membershipLevel == 5 && !User.IsInRole("Admin"))
    throw new UnauthorizedAccessException("Tier 5 is admin-only");
  ```
