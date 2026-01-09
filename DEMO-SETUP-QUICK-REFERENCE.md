# Demo Database Setup - Quick Reference

## TL;DR - Get Started in 5 Minutes

```bash
# Step 1: Create schema (2-3 seconds)
mysql -h justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com -u admin -p justsku_demo < setup-demo-database.sql

# Step 2: Add test user + sample data (1 second)
mysql -h justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com -u admin -p justsku_demo < seed-demo-user-and-customer.sql

# Step 3: Generate mock data (3-5 minutes for 1000 products)
cd c:\Users\dcbau\Code\SkuVaultSaaS
.\generate-mock-data.ps1 -CustomerId 2 -Products 1000 -Locations 50

# Step 4: Login and test
# Email: test@justsku.com
# Password: Test@123456
```

## Files You Need

| File | Purpose |
|------|---------|
| `setup-demo-database.sql` | Create database schema (tables, indexes, constraints) |
| `seed-demo-user-and-customer.sql` | Add test user (ID 2) with sample data |
| `generate-mock-data.ps1` | Generate realistic inventory/sales data |

## Default Test Account

| Field | Value |
|-------|-------|
| Email | test@justsku.com |
| Password | Test@123456 |
| User ID | user-2 |
| Customer ID | 2 |
| Membership | Premium (Level 3) |
| Status | Active |

## What Gets Created

### Schema Setup (setup-demo-database.sql)
- ✅ 40+ database tables
- ✅ All ASP.NET Identity tables
- ✅ SkuVault integration tables  
- ✅ Financial/transaction tables
- ✅ Proper indexes and relationships
- ✅ 13 EF Core migrations recorded

### User & Customer (seed-demo-user-and-customer.sql)
- ✅ 1 test user (test@justsku.com)
- ✅ 1 customer record
- ✅ 1 tenant (SkuVault connection)
- ✅ 4 warehouse locations
- ✅ 10 sample products
- ✅ Inventory levels
- ✅ 15+ transactions
- ✅ 20+ sales orders
- ✅ Low stock alerts
- ✅ Notification preferences

### Mock Data (generate-mock-data.ps1)
- 1000+ products (configurable)
- 50+ warehouse locations (configurable)
- 50,000+ inventory records
- 10,000+ transactions
- 2,000+ sales orders
- 90 days of history (configurable)

## Common Commands

```powershell
# List all customers
.\generate-mock-data.ps1 -ListCustomers

# Generate data for customer 2 (test user)
.\generate-mock-data.ps1 -CustomerId 2 -Products 1000 -Locations 50

# View statistics
.\generate-mock-data.ps1 -CustomerId 2 -Stats

# Clear old data and regenerate
.\generate-mock-data.ps1 -CustomerId 2 -Clear -Products 1000 -Locations 50

# Generate for different environment
.\generate-mock-data.ps1 -CustomerId 2 -Environment uat
```

## Database Credentials

```
Host: justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com
User: admin
Password: >-[x|6PEQJJ?nmeFG|zh7hQF8w[)
Database: justsku_demo
Port: 3306
```

## Execution Times

| Operation | Time |
|-----------|------|
| Schema setup | 2-3 seconds |
| Seed user + sample data | 1 second |
| Mock data (1000 products) | 3-5 minutes |
| Mock data (5000 products) | 15-20 minutes |
| Mock data (50000 products) | 2-3 hours |

## Verify Setup Worked

```sql
-- Count records in demo database
SELECT 'Products' as Type, COUNT(*) as Count FROM SkuVaultProducts WHERE CustomerId = 2
UNION ALL
SELECT 'Inventory Levels', COUNT(*) FROM SkuVaultInventory WHERE CustomerId = 2
UNION ALL
SELECT 'Transactions', COUNT(*) FROM Transactions WHERE CustomerId = 2
UNION ALL
SELECT 'Sales Orders', COUNT(*) FROM Sales WHERE CustomerId = 2;
```

## Docker Deployment

```bash
# SSH to EC2
ssh -i api-key.pem ubuntu@ec2-address

# Load Docker image
docker load -i /tmp/justsku-api-latest.tar

# Run with demo database
docker run -d \
  --name justsku-api \
  -p 5239:5239 \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e DB_HOST=justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com \
  -e DB_NAME=justsku_demo \
  -e DB_USER=admin \
  -e DB_PASSWORD='>-[x|6PEQJJ?nmeFG|zh7hQF8w[)' \
  -e SEEDING_ENABLED=true \
  justsku-api:latest

# Check logs
docker logs -f justsku-api
```

## Next Steps

1. ✅ Import `setup-demo-database.sql` → Creates schema
2. ✅ Import `seed-demo-user-and-customer.sql` → Creates test user
3. ✅ Run mock data generator → Populates with data
4. ✅ Load Docker image on EC2 → Deploy application
5. ✅ Login with test credentials → Start testing
6. ✅ Run API tests → Verify functionality

## Troubleshooting

**Q: "Access denied" when running MySQL commands?**
A: Wrong password. Use: `>-[x|6PEQJJ?nmeFG|zh7hQF8w[)`

**Q: "Customer with ID 2 not found" when generating data?**
A: Seed the user first: `seed-demo-user-and-customer.sql`

**Q: Mock data generator runs very slowly?**
A: Use smaller dataset: `-Products 500 -Locations 20`

**Q: Tables already exist error?**
A: Safe to ignore - script uses `IF NOT EXISTS` clauses

**Q: Need to clear and restart?**
A: Use `-Clear` flag: `.\generate-mock-data.ps1 -CustomerId 2 -Clear`

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  EC2 Instance (Ubuntu)                   │
│  ┌──────────────────────────────────────────────────────┐
│  │  Docker Container (justsku-api:latest)               │
│  │  - ASP.NET Core API (.NET 8)                         │
│  │  - Port 5239                                         │
│  │  - Connects to RDS MySQL                             │
│  └──────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────┘
                          ↓ (Port 3306)
┌─────────────────────────────────────────────────────────┐
│            AWS RDS MySQL Instance                        │
│  ┌──────────────────────────────────────────────────────┐
│  │  Database: justsku_demo                              │
│  │  - 40+ tables with full schema                       │
│  │  - Test customer (ID 2) with sample data             │
│  │  - Ready for mock data generation                    │
│  └──────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────┘
```

## Documentation Files

- [DEMO-DATABASE-SETUP.md](DEMO-DATABASE-SETUP.md) - Detailed setup instructions
- [MOCK-DATA-GENERATOR-GUIDE.md](MOCK-DATA-GENERATOR-GUIDE.md) - Complete generator documentation
- [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md) - Production deployment guide
- [setup-demo-database.sql](setup-demo-database.sql) - Database schema SQL
- [seed-demo-user-and-customer.sql](seed-demo-user-and-customer.sql) - Test user SQL
- [generate-mock-data.ps1](generate-mock-data.ps1) - Mock data generator

## Need Help?

- Check documentation files above for detailed info
- Review [generate-mock-data.ps1](generate-mock-data.ps1) usage examples
- Run `.\generate-mock-data.ps1` without parameters to see help
- Check application logs: `docker logs -f justsku-api`
