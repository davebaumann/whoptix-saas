# Mock Data Generator for SkuVault SaaS

This tool generates realistic test data for your dev and UAT environments to help with report development and testing.

## Features

- **Realistic Product Data**: Generates products across multiple categories with proper SKUs, pricing, and descriptions
- **Warehouse Locations**: Creates realistic warehouse bins and locations
- **Historical Transactions**: Generates 90+ days of realistic transaction history
- **Picker Performance Data**: Creates employee transaction data for performance reports
- **Sales & Shipments**: Generates realistic sales and shipment data
- **Seasonal Patterns**: Includes realistic business patterns (weekends, holidays, seasonal trends)
- **Scalable**: Can generate thousands of products and millions of transactions

## Quick Start

### 1. List Available Customers
```powershell
.\generate-mock-data.ps1 -ListCustomers
```

### 2. Generate Basic Mock Data
```powershell
# Generate 1000 products, 50 locations, 90 days history
.\generate-mock-data.ps1 -CustomerId 1
```

### 3. Generate Large Dataset
```powershell
# Generate 5000 products, 100 locations, 180 days history
.\generate-mock-data.ps1 -CustomerId 1 -Products 5000 -Locations 100 -HistoryDays 180
```

### 4. Clear and Regenerate
```powershell
# Clear existing data and generate fresh dataset
.\generate-mock-data.ps1 -CustomerId 1 -Clear
```

### 5. Check Statistics
```powershell
# View current data statistics
.\generate-mock-data.ps1 -CustomerId 1 -Stats
```

## Environment Configuration

### Development Environment
```powershell
.\generate-mock-data.ps1 -CustomerId 1 -Environment dev
```

### UAT Environment
```powershell
.\generate-mock-data.ps1 -CustomerId 1 -Environment uat
```

### Custom Connection String
```powershell
.\generate-mock-data.ps1 -CustomerId 1 -ConnectionString "Server=myserver;Database=mydb;..."
```

## Generated Data Types

### Products (1000+ items)
- **Categories**: Electronics, Apparel, Home & Garden, Sports, Health & Beauty, Automotive
- **Realistic SKUs**: Category-based SKU generation (e.g., ELE-WIRE-1234)
- **Pricing**: Cost + realistic markup (1.5x to 3.5x)
- **Variants**: Colors, sizes, materials

### Locations (50+ locations)
- **Warehouses**: Main, East Coast, West Coast, Midwest, South
- **Bins**: Realistic bin codes (e.g., MainWarehouse-A12, EastCoast-B05)
- **Distribution**: Products distributed across multiple locations

### Historical Data (90+ days)
- **Transactions**: Pick, Pack, Receive, Adjust, Transfer, Return
- **Sales**: Multi-channel sales (Amazon, eBay, Shopify, Direct)
- **Shipments**: Realistic carrier data (UPS, FedEx, USPS)
- **Employees**: 20+ realistic employee names for picker performance
- **Patterns**: Reduced activity on weekends/holidays

### Performance Data
- **Picker Rates**: Realistic pick rates (30-70 picks/hour)
- **Efficiency Metrics**: Performance variations by employee
- **Time Patterns**: Business hours activity (8 AM - 6 PM)
- **Seasonal Trends**: Holiday spikes, summer lulls

## Data Volume Examples

| Configuration | Products | Locations | Days | Transactions | Sales | Shipments | Generation Time |
|---------------|----------|-----------|------|--------------|-------|-----------|-----------------|
| Small         | 500      | 25        | 30   | ~45K         | ~11K  | ~7K       | ~2 minutes      |
| Medium        | 1000     | 50        | 90   | ~405K        | ~101K | ~67K      | ~8 minutes      |
| Large         | 5000     | 100       | 180  | ~1.6M        | ~400K | ~270K     | ~30 minutes     |
| Enterprise    | 10000    | 200       | 365  | ~6.5M        | ~1.6M | ~1.1M     | ~2 hours        |

## Command Line Options

### PowerShell Script Parameters
```powershell
-CustomerId      # Required: Customer ID to generate data for
-Products        # Number of products (default: 1000)
-Locations       # Number of locations (default: 50)  
-HistoryDays     # Days of historical data (default: 90)
-Clear           # Clear existing data before generating
-ListCustomers   # List available customers
-Stats           # Show data statistics for customer
-Environment     # Environment: dev, uat, local (default: dev)
-ConnectionString # Custom database connection string
```

### Direct Console App Usage
```bash
# Navigate to Tools directory
cd backend/SkuVaultSaaS.Tools

# Generate data
dotnet run -- generate --customer-id 1 --products 1000 --locations 50 --history-days 90

# List customers
dotnet run -- list-customers

# Show statistics
dotnet run -- stats --customer-id 1

# Clear and regenerate
dotnet run -- generate --customer-id 1 --clear
```

## Use Cases

### Report Development
Generate realistic data to test new reports:
```powershell
# Generate focused dataset for picker performance reports
.\generate-mock-data.ps1 -CustomerId 1 -Products 500 -HistoryDays 30

# Generate large dataset for performance testing
.\generate-mock-data.ps1 -CustomerId 1 -Products 10000 -HistoryDays 365
```

### Demo Preparation
Create compelling demo data:
```powershell
# Generate demo-ready dataset with recent activity
.\generate-mock-data.ps1 -CustomerId 1 -Products 2000 -HistoryDays 60 -Clear
```

### UAT Testing
Populate UAT environment:
```powershell
# Generate production-like dataset for UAT
.\generate-mock-data.ps1 -CustomerId 1 -Environment uat -Products 5000 -HistoryDays 180
```

## Data Patterns & Realism

### Business Patterns
- **Weekday Activity**: Higher transaction volume Monday-Friday
- **Business Hours**: Most activity 8 AM - 6 PM
- **Seasonal Trends**: Holiday spikes, summer variations
- **Employee Performance**: Realistic variation in picker rates

### Product Distribution
- **Category Balance**: Even distribution across product categories
- **Price Ranges**: Realistic pricing by category
- **Inventory Levels**: Appropriate stock levels by product type
- **Location Distribution**: Products spread across multiple locations

### Transaction Realism
- **Pick Patterns**: Realistic pick quantities and timing
- **Receiving**: Bulk receiving with PO references
- **Adjustments**: Cycle count adjustments and corrections
- **Returns**: Customer return processing

## Troubleshooting

### Connection Issues
```powershell
# Test connection with list customers
.\generate-mock-data.ps1 -ListCustomers -Environment dev
```

### Performance Issues
```powershell
# Generate smaller dataset first
.\generate-mock-data.ps1 -CustomerId 1 -Products 100 -HistoryDays 7

# Check current data size
.\generate-mock-data.ps1 -CustomerId 1 -Stats
```

### Memory Issues
- Large datasets (10K+ products, 365+ days) may require increased memory
- Generate in smaller batches if needed
- Monitor database performance during generation

## Integration with Reports

The generated data is designed to work seamlessly with your existing reports:

- **Low Stock Report**: Products with realistic low stock situations
- **Picker Performance**: Employee performance metrics and trends  
- **Aging Inventory**: Products with various aging patterns
- **Sales Analytics**: Multi-channel sales data with trends
- **Financial Reports**: Cost and pricing data for profitability analysis

## Maintenance

### Regular Refresh
```powershell
# Weekly refresh for active development
.\generate-mock-data.ps1 -CustomerId 1 -Clear -HistoryDays 30

# Monthly full refresh
.\generate-mock-data.ps1 -CustomerId 1 -Clear -HistoryDays 90
```

### Environment Sync
Keep dev and UAT environments synchronized with similar data volumes for consistent testing.

## Future Enhancements

- **Industry-Specific Data**: Tailored product catalogs by industry
- **Customer Segmentation**: Different data patterns by customer size
- **Advanced Seasonality**: More sophisticated seasonal patterns
- **Real-Time Updates**: Continuous data generation for live demos
- **Data Export**: Export generated data for sharing between environments