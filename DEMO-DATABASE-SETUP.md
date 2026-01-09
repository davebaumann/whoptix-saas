# Demo Database Setup

Your demo database schema is ready to be created in AWS RDS.

## Quick Setup

### Step 1: Create Database Schema

#### Option 1A: Run SQL Script via AWS Console
1. Go to AWS RDS → Databases → justsku-db
2. Open Query Editor
3. Copy-paste the contents of `setup-demo-database.sql`
4. Run the script
5. Switch your app to use `justsku_demo` database

#### Option 1B: Run via MySQL CLI
```bash
mysql -h justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com \
       -u admin \
       -p \
       justsku_demo < setup-demo-database.sql
```

When prompted for password, use: `>-[x|6PEQJJ?nmeFG|zh7hQF8w[)`

#### Option 1C: Run via MySQL Workbench
1. Open MySQL Workbench
2. Create connection to `justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com`
3. Open `setup-demo-database.sql` file
4. Execute query

### Step 2: Seed Demo User & Customer (Optional but Recommended)

Once the schema is created, populate with a test user and sample data:

```bash
mysql -h justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com \
       -u admin \
       -p \
       justsku_demo < seed-demo-user-and-customer.sql
```

This creates:
- **Test User** (User ID: 2)
  - Email: `test@justsku.com`
  - Password: `Test@123456`
  - Role: Customer (can be promoted to Admin if needed)
  
- **Customer Record** (Customer ID: 2)
  - Name: Demo Test Company
  - Membership Level: 3 (Premium)
  - Status: Active
  
- **Sample Data** (for testing)
  - 4 warehouse locations
  - 10 products with realistic SKUs
  - Inventory across locations
  - 15+ sample transactions
  - 20+ sales orders
  - Low stock alerts
  - Notification preferences

### Step 3: Generate Additional Mock Data (Optional)

To populate even more data using the mock data generator:

```powershell
cd "c:\Users\dcbau\Code\SkuVaultSaaS"
.\generate-mock-data.ps1 -CustomerId 2 -Products 500 -Locations 50 -HistoryDays 90
```

This generates:
- 500 products
- 50 warehouse locations
- 90 days of transaction history

## After Setup

Once tables are created:

1. **Update environment variables** to point to demo database:
   ```bash
   DB_NAME=justsku_demo
   SEEDING_ENABLED=true  # Enable to seed demo data
   ```

2. **Restart application** to use demo database

3. **Login with admin or test user credentials**:
   - **Admin Account** (if using seeding):
     - Email: `info@justsku.com`
     - Password: `$kUVault138!`
   
   - **Test User** (from seed script):
     - Email: `test@justsku.com`
     - Password: `Test@123456`
     - Customer ID: 2
     - Includes 10 products, 4 locations, and sample transaction history

## Notes

- The script creates all required tables with proper indexes
- Migration history is recorded so EF Core won't try to re-run migrations
- Foreign key constraints are properly configured
- All tables use UTF8MB4 character set for full Unicode support

## Schema Overview

**Core Identity Tables:**
- AspNetUsers, AspNetRoles, AspNetUserRoles (ASP.NET Core Identity)
- UserInvitations (custom user invitation system)

**Business Tables:**
- Customers (SaaS customers)
- Tenants (SkuVault account info)
- SkuVaultProducts, SkuVaultInventory, SkuVaultLocations (Inventory)
- InventoryMovements (Audit trail)
- LowStockThresholds (Notifications)
- Transactions, Sales (Financial records)
- CustomerNotificationPreferences (User preferences)

**Metadata Tables:**
- __EFMigrationsHistory (EF Core migration tracking)
