# Mock Data Generator - Complete Guide

## Overview

The **SkuVault SaaS Demo** includes a PowerShell-based mock data generator that creates realistic inventory, transaction, and sales data for testing and demonstration purposes.

## How It Works

The mock data generator creates:

1. **Warehouse Locations** - Physical inventory locations
2. **Products** - SKU-based inventory items with realistic names and categories
3. **Inventory Levels** - Stock quantities across locations
4. **Transactions** - Historical inventory movements (Add, Remove, Pick, Create)
5. **Sales Orders** - Order records with channel and status tracking
6. **Shipments** - Shipping records (optional)
7. **Low Stock Alerts** - Threshold-based notifications

## Quick Start

### Create Test User and Basic Data

First, seed the demo database with a test user and customer:

```bash
mysql -h justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com \
       -u admin \
       -p \
       justsku_demo < seed-demo-user-and-customer.sql
```

This creates:
- **User ID 2**: `test@justsku.com` / `Test@123456`
- **Customer ID 2**: Demo Test Company (Premium tier)
- Sample data: 10 products, 4 locations, 15+ transactions, 20+ sales orders

### Generate Additional Mock Data

From the repository root, run the mock data generator:

```powershell
cd c:\Users\dcbau\Code\SkuVaultSaaS
.\generate-mock-data.ps1 -CustomerId 2 -Products 1000 -Locations 50
```

This adds:
- 1000 additional products
- 50 warehouse locations
- Inventory distribution across locations
- 90 days of transaction history (default)

## Usage Examples

### List Available Customers

See all customers in the database:

```powershell
.\generate-mock-data.ps1 -ListCustomers
```

Output:
```
Listing customers...
Customer 1: Acme Corporation
Customer 2: Demo Test Company
...
```

### Generate Data for a Specific Customer

```powershell
# Generate 1000 products and 50 locations
.\generate-mock-data.ps1 -CustomerId 2 -Products 1000 -Locations 50

# Generate with extended history (180 days)
.\generate-mock-data.ps1 -CustomerId 2 -HistoryDays 180

# Replace existing data with fresh data
.\generate-mock-data.ps1 -CustomerId 2 -Clear

# Generate large dataset
.\generate-mock-data.ps1 -CustomerId 2 -Products 5000 -Locations 100 -Clear
```

### View Statistics

See how much data was generated:

```powershell
.\generate-mock-data.ps1 -CustomerId 2 -Stats
```

Output:
```
Statistics for customer 2:
  Products: 1010
  Locations: 54
  Inventory Levels: 54,540
  Transactions: 12,345
  Sales Orders: 2,890
  Total Records: 69,839
```

### Use Different Environments

The generator can target different database environments:

```powershell
# Development environment (default)
.\generate-mock-data.ps1 -CustomerId 1 -Environment dev

# UAT environment
.\generate-mock-data.ps1 -CustomerId 1 -Environment uat

# Production environment (requires .env.prod file)
.\generate-mock-data.ps1 -CustomerId 1 -Environment prod
```

### Custom Connection String

If automatic connection string detection fails, provide it manually:

```powershell
$connStr = "Server=justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com;Database=justsku_demo;User=admin;Password=xxxxx;Port=3306;"
.\generate-mock-data.ps1 -CustomerId 2 -ConnectionString $connStr
```

## Parameter Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `-CustomerId` | int | 0 | **Required** for data generation. Customer ID to generate data for |
| `-Products` | int | 1000 | Number of products to create |
| `-Locations` | int | 50 | Number of warehouse locations |
| `-HistoryDays` | int | 90 | Days of transaction history to generate |
| `-Environment` | string | dev | Environment: dev, uat, prod, demo |
| `-Clear` | switch | false | Clear existing data before generating (use with caution!) |
| `-ListCustomers` | switch | false | List all customers and exit |
| `-Stats` | switch | false | Show statistics for a customer and exit |
| `-ConnectionString` | string | auto | Override automatic connection string detection |

## Generated Data Details

### Products
- **Realistic names** from 12 product categories
- **SKU format**: `CATEGORY-TYPE-###` (e.g., `ELEC-HEADPHONES-001`)
- **Categories**:
  - Electronics, Apparel, Home & Garden, Sports & Outdoors
  - Health & Beauty, Automotive, Books, Toys & Games
  - Office Supplies, Pet Supplies, Kitchen & Dining, Tools & Hardware

### Locations
- **Warehouse names**: Main Warehouse, East Coast, West Coast, Midwest, South
- **Default location** randomly assigned
- **Regional distribution** for multi-location inventory management

### Inventory Levels
- **Quantities**: Random between 10-1000 units per location
- **Status**: Active, Low Stock, or Out of Stock
- **Distribution**: Products may be stocked at multiple locations

### Transactions
- **Types**: Add, Remove, Pick, Create
- **Date range**: Last 90 days (configurable)
- **Employee names**: Realistic for tracking picker performance
- **Realistic patterns**: More picks during business hours, more adds on weekdays

### Sales Orders
- **Channels**: Amazon, eBay, Shopify, Direct, Walmart
- **Status**: Pending, Shipped, Delivered
- **Pricing**: Random amounts $100-$5100
- **Dates**: Distributed across the history period
- **Carriers**: UPS, FedEx, USPS, DHL, OnTrac

## Workflow Examples

### Setup a Complete Demo Environment

```powershell
# 1. Initialize database schema
mysql -h justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com -u admin -p justsku_demo < setup-demo-database.sql

# 2. Seed test user and customer
mysql -h justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com -u admin -p justsku_demo < seed-demo-user-and-customer.sql

# 3. Generate mock data (moderate dataset)
.\generate-mock-data.ps1 -CustomerId 2 -Products 1000 -Locations 50

# 4. View statistics to verify
.\generate-mock-data.ps1 -CustomerId 2 -Stats
```

### Create Multiple Test Customers

```powershell
# Customer 1: Small business (500 products)
.\generate-mock-data.ps1 -CustomerId 1 -Products 500 -Locations 5

# Customer 2: Medium business (2000 products)
.\generate-mock-data.ps1 -CustomerId 2 -Products 2000 -Locations 20

# Customer 3: Enterprise (10000 products)
.\generate-mock-data.ps1 -CustomerId 3 -Products 10000 -Locations 100
```

### Load Test Data Preparation

```powershell
# Create large dataset with 2 years of history for load testing
.\generate-mock-data.ps1 -CustomerId 999 `
    -Products 50000 `
    -Locations 200 `
    -HistoryDays 730 `
    -Clear
```

### Refresh Demo Data

```powershell
# Clear old data and generate fresh dataset
.\generate-mock-data.ps1 -CustomerId 2 -Clear -Products 1000 -Locations 50
```

## Troubleshooting

### Error: "Could not find connection string"

**Cause**: Missing `.env` file for the target environment.

**Solution**: Create `backend/SkuVaultSaaS.Api/.env.dev` with:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=justsku_dev
```

### Error: "Customer with ID X not found"

**Cause**: The specified customer doesn't exist in the database.

**Solution**: 
1. List customers: `.\generate-mock-data.ps1 -ListCustomers`
2. Use an existing customer ID or create one through the Admin API first

### Error: "Access denied for user 'admin'"

**Cause**: Incorrect database password.

**Solution**: 
1. Verify password in `.env` file
2. Test connection manually: `mysql -h [host] -u admin -p`

### Generator runs very slowly

**Cause**: Large dataset generation with insufficient resources.

**Solution**:
1. Use smaller values: `-Products 500 -Locations 20`
2. Run during off-peak hours
3. Increase RDS instance size temporarily

## Performance Considerations

| Dataset Size | Products | Locations | Est. Time | Est. Records |
|--------------|----------|-----------|-----------|--------------|
| Small        | 500      | 10        | 2-3 min   | 15,000      |
| Medium       | 1,000    | 50        | 5-7 min   | 70,000      |
| Large        | 5,000    | 100       | 20-30 min | 500,000     |
| XL           | 50,000   | 200       | 2-3 hours | 5,000,000   |

## Database Impact

The mock data generator:

- ✅ **Creates indexes** for optimal query performance
- ✅ **Maintains referential integrity** with proper foreign keys
- ✅ **Respects seeding flags** (won't conflict with production seeding)
- ⚠️ **Requires write permissions** on the target database
- ⚠️ **May lock tables** during bulk inserts (brief, non-blocking)

## Cleanup

To remove all generated data for a customer:

```sql
DELETE FROM Sales WHERE CustomerId = 2;
DELETE FROM Transactions WHERE CustomerId = 2;
DELETE FROM InventoryMovements WHERE CustomerId = 2;
DELETE FROM InventoryLevels WHERE CustomerId = 2;
DELETE FROM SkuVaultProducts WHERE CustomerId = 2;
DELETE FROM SkuVaultLocations WHERE CustomerId = 2;
```

Or use the built-in clear flag:

```powershell
.\generate-mock-data.ps1 -CustomerId 2 -Clear
```

## Integration with CI/CD

For automated testing environments, you can use the generator in scripts:

```powershell
# In your deployment/test script
.\generate-mock-data.ps1 -CustomerId 2 `
    -Products 1000 `
    -Locations 50 `
    -Environment test `
    -ConnectionString $testConnectionString
```

## Support

For issues or feature requests, check:
- [MockDataGenerator.cs](backend/SkuVaultSaaS.Tools/MockDataGenerator.cs) - Implementation details
- [Program.cs](backend/SkuVaultSaaS.Tools/Program.cs) - CLI command handling
- Application logs for detailed error messages
