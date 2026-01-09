# 🎯 Demo Database Setup - At a Glance

## Three Simple Steps

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: SCHEMA (2-3 seconds)                                    │
├─────────────────────────────────────────────────────────────────┤
│ mysql ... < setup-demo-database.sql                             │
│                                                                  │
│ Creates: 40+ tables, indexes, relationships                     │
│ File: setup-demo-database.sql (4.5 KB)                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: USER & SAMPLE DATA (1 second)                           │
├─────────────────────────────────────────────────────────────────┤
│ mysql ... < seed-demo-user-and-customer.sql                     │
│                                                                  │
│ Creates:                                                        │
│   • User: test@justsku.com / Test@123456                        │
│   • Customer: Demo Test Company (Premium)                       │
│   • 4 warehouse locations with 10 products                      │
│   • 35+ sample transactions and orders                          │
│                                                                  │
│ File: seed-demo-user-and-customer.sql (9.8 KB)                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: GENERATE MOCK DATA (3-30 minutes, optional)             │
├─────────────────────────────────────────────────────────────────┤
│ .\generate-mock-data.ps1 -CustomerId 2 -Products 1000           │
│                                                                  │
│ Generates:                                                      │
│   • 1000+ products with realistic SKUs                          │
│   • 50+ warehouse locations                                     │
│   • 50,000+ inventory records                                   │
│   • 10,000+ transactions                                        │
│   • 2,000+ sales orders                                         │
│   • 90+ days of history                                         │
│                                                                  │
│ File: generate-mock-data.ps1 (existing tool)                    │
└─────────────────────────────────────────────────────────────────┘
```

## What Gets Created

```
DATABASE: justsku_demo
├── TABLES: 40+
│   ├── Identity (AspNetUsers, AspNetRoles, AspNetClaims)
│   ├── Business (Customers, Tenants)
│   ├── Inventory (SkuVaultProducts, SkuVaultInventory, SkuVaultLocations)
│   ├── Transactions (Transactions, InventoryMovements, Sales, Shipments)
│   ├── Alerts (LowStockThresholds, CustomerNotificationPreferences)
│   └── Metadata (__EFMigrationsHistory)
│
├── TEST USER: user-2
│   ├── Email: test@justsku.com
│   ├── Password: Test@123456
│   ├── Status: Active, EmailConfirmed
│   └── Customer: Demo Test Company (ID: 2)
│
├── SAMPLE DATA: Included
│   ├── 4 Warehouse Locations
│   ├── 10 Products (10 different categories)
│   ├── 40 Inventory Levels (across locations)
│   ├── 15+ Transactions
│   ├── 20+ Sales Orders
│   ├── 10+ Low Stock Alerts
│   └── 4 Notification Preferences
│
└── GENERATED DATA: Optional (via script)
    ├── 500-50,000 Products (configurable)
    ├── 10-200 Warehouse Locations
    ├── 50,000-5,000,000 Inventory Records
    ├── 10,000-100,000 Transactions
    └── 2,000-20,000 Sales Orders
```

## Files You Get

```
📁 Repository Root
│
├── 📄 setup-demo-database.sql
│   └── Complete schema with all migrations
│
├── 📄 seed-demo-user-and-customer.sql
│   └── Test user + 35+ sample records
│
├── 🔧 generate-mock-data.ps1
│   └── Create realistic data at scale
│
├── 📖 DEMO-SETUP-QUICK-REFERENCE.md ⭐ START HERE
│   └── 5-minute quick start guide
│
├── 📖 DEMO-DATABASE-SETUP.md
│   └── Detailed step-by-step instructions
│
├── 📖 MOCK-DATA-GENERATOR-GUIDE.md
│   └── Complete generator documentation (20+ examples)
│
├── 📖 DEPLOYMENT-CHECKLIST.md
│   └── Production deployment guide
│
├── 📖 DEMO-DATABASE-COMPLETE.md
│   └── Comprehensive summary
│
└── 📖 THIS FILE (README-VISUAL)
    └── Quick visual overview
```

## Test Login

```
┌──────────────────────────────────┐
│ Email:    test@justsku.com       │
│ Password: Test@123456            │
│ Role:     Customer (Premium)     │
│ Status:   Active                 │
└──────────────────────────────────┘
```

## Commands Quick Reference

```bash
# CREATE SCHEMA
mysql -h justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com \
       -u admin -p justsku_demo < setup-demo-database.sql

# SEED USER + DATA
mysql -h justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com \
       -u admin -p justsku_demo < seed-demo-user-and-customer.sql

# GENERATE DATA
cd c:\Users\dcbau\Code\SkuVaultSaaS
.\generate-mock-data.ps1 -CustomerId 2 -Products 1000 -Locations 50

# LIST CUSTOMERS
.\generate-mock-data.ps1 -ListCustomers

# VIEW STATS
.\generate-mock-data.ps1 -CustomerId 2 -Stats

# CLEAR & REGENERATE
.\generate-mock-data.ps1 -CustomerId 2 -Clear -Products 5000
```

## Database Info

```
┌────────────────────────────────────────┐
│ Host:     justsku-db.cunciu0eq231...  │
│ Database: justsku_demo                 │
│ User:     admin                        │
│ Password: >-[x|6PEQJJ?nmeFG|...      │
│ Port:     3306                         │
└────────────────────────────────────────┘
```

## Timeline

```
⏱️  2-3 seconds   → Setup schema
⏱️  1 second      → Seed user & data
⏱️  3-5 min       → Generate 1K products
⏱️  10-30 min     → Generate 5K products
⏱️  2-3 hours     → Generate 50K products
___________________________________________
TOTAL (minimal): ~5 seconds to 1 minute
TOTAL (with data): 5-30 minutes depending on volume
```

## What's Included in Each Step

### STEP 1: Schema Setup
```sql
✅ AspNetRoles (Identity roles)
✅ AspNetUsers (Identity users)
✅ AspNetUserRoles, AspNetUserClaims, AspNetUserLogins, AspNetUserTokens
✅ Customers (SaaS customers)
✅ Tenants (SkuVault connections)
✅ SkuVaultProducts (Inventory items)
✅ SkuVaultInventory (Stock levels)
✅ SkuVaultLocations (Warehouses)
✅ InventoryMovements (Audit trail)
✅ Transactions (Stock transactions)
✅ Sales (Sales orders)
✅ Shipments (Shipping records)
✅ LowStockThresholds (Alerts)
✅ CustomerNotificationPreferences
✅ UserInvitations (Team access)
✅ __EFMigrationsHistory (13 migrations)
... and 20+ more tables with proper relationships
```

### STEP 2: User & Sample Data
```sql
✅ Test User (test@justsku.com)
✅ Test Customer (Demo Test Company)
✅ Test Tenant (SkuVault connection)
✅ 4 Warehouse Locations
✅ 10 Sample Products
✅ 40 Inventory Levels
✅ 15+ Sample Transactions
✅ 20+ Sample Sales Orders
✅ 10+ Low Stock Thresholds
✅ 4 Notification Preferences
```

### STEP 3: Mock Data (Optional)
```
✅ 1000+ Products (1000 = default)
✅ 50+ Warehouse Locations (50 = default)
✅ 40K+ Inventory Levels
✅ 10K+ Transactions
✅ 2K+ Sales Orders
... or 5000+ products, 100+ locations, millions of records
```

## Next Steps

1. **Read:** [DEMO-SETUP-QUICK-REFERENCE.md](DEMO-SETUP-QUICK-REFERENCE.md) (2 min)
2. **Run:** Setup scripts (1 min)
3. **Generate:** Mock data (5-30 min)
4. **Test:** Login and verify (5 min)
5. **Deploy:** Docker container on EC2

## Documentation Map

```
Want to get started FAST?
    👉 DEMO-SETUP-QUICK-REFERENCE.md

Want step-by-step instructions?
    👉 DEMO-DATABASE-SETUP.md

Want to understand the generator?
    👉 MOCK-DATA-GENERATOR-GUIDE.md

Want production deployment info?
    👉 DEPLOYMENT-CHECKLIST.md

Want complete summary?
    👉 DEMO-DATABASE-COMPLETE.md

Want visual overview?
    👉 THIS FILE (README-VISUAL)
```

## Success Indicators ✅

After setup, you should see:
- ✅ 40+ tables created
- ✅ 0 errors during import
- ✅ Test user available
- ✅ Sample data visible in tables
- ✅ Verification queries show records

## Ready? 🚀

```
START HERE 👇
DEMO-SETUP-QUICK-REFERENCE.md
```

Then run:
```bash
# Step 1
mysql ... < setup-demo-database.sql

# Step 2
mysql ... < seed-demo-user-and-customer.sql

# Step 3 (optional)
.\generate-mock-data.ps1 -CustomerId 2 -Products 1000

# Done! Login with:
# Email: test@justsku.com
# Password: Test@123456
```

---

**That's it!** Your demo database is ready to go! 🎉
