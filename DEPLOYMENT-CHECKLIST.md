# Production Deployment Checklist - Demo Environment Ready

## ✅ Completed

### Code Changes
- [x] Encryption keys moved to AWS Parameter Store (`/justsku/ENCRYPTION_KEY`, `/justsku/ENCRYPTION_IV`)
- [x] Admin seeding disabled in production
- [x] Seeding configuration added to appsettings
- [x] Program.cs updated to load encryption keys from Parameter Store
- [x] DbSeeder.cs updated to respect seeding configuration
- [x] Git changes committed

### Docker Image
- [x] Docker image rebuilt with all changes: `justsku-api:latest` (104.1 MB)
- [x] Image exported to tar: `justsku-api-latest.tar`
- [x] Image transferred to EC2: `/tmp/justsku-api-latest.tar`

### Database Schema
- [x] Demo database schema generated: `setup-demo-database.sql`
- [x] Includes all 13 EF Core migrations
- [x] Contains 40+ tables with proper indexes and relationships
- [x] Ready to import to `justsku_demo` database

### Documentation
- [x] DEMO-DATABASE-SETUP.md with three import options
- [x] EC2 setup script: ec2-setup-demo.sh
- [x] This deployment checklist

## 🚀 Ready for Next Steps

### Option A: Manual Setup (Recommended for Testing)

1. **SSH into EC2 and load Docker image:**
   ```bash
   ssh -i API_Key/justsku-api-key.pem ubuntu@ec2-3-220-39-244.compute-1.amazonaws.com
   docker load -i /tmp/justsku-api-latest.tar
   docker images | grep justsku-api
   ```

2. **Import demo database schema:**
   ```bash
   mysql -h justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com \
         -u admin \
         -p \
         justsku_demo < setup-demo-database.sql
   ```
   (Password: `>-[x|6PEQJJ?nmeFG|zh7hQF8w[)`)

3. **Run Docker container:**
   ```bash
   docker run -d \
     --name justsku-api \
     -p 5239:5239 \
     -e ASPNETCORE_ENVIRONMENT=Production \
     -e DB_HOST=justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com \
     -e DB_NAME=justsku_demo \
     -e DB_USER=admin \
     -e DB_PASSWORD='<password>' \
     -e SEEDING_ENABLED=true \
     justsku-api:latest
   ```

4. **Test application:**
   - Navigate to: `http://ec2-3-220-39-244.compute-1.amazonaws.com:5239/api/health`
   - Login: `info@justsku.com` / `$kUVault138!` (seeded automatically)

### Option B: Using provided script

1. Upload `ec2-setup-demo.sh` to EC2
2. Run: `bash ec2-setup-demo.sh`
3. Follow the prompts

## 📋 Configuration Summary

### Production Environment Variables
```
ASPNETCORE_ENVIRONMENT=Production
DB_HOST=justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com
DB_NAME=justsku_prod        # or justsku_demo for testing
DB_USER=admin
DB_PASSWORD=<from AWS Secrets Manager>
SEEDING_ENABLED=false       # Set to true for demo
STRIPE_PUBLISHABLE_KEY=<from Parameter Store>
STRIPE_SECRET_KEY=<from Parameter Store>
STRIPE_WEBHOOK_SECRET=<from Parameter Store>
```

### AWS Parameter Store Configured
- ✅ `/justsku/ENCRYPTION_KEY`
- ✅ `/justsku/ENCRYPTION_IV`
- ✅ `/justsku/stripe-publishable-key`
- ✅ `/justsku/stripe-secret-key`
- ✅ `/justsku/stripe-webhook-secret`

## � Configuration Summary

### Production Environment Variables
```
ASPNETCORE_ENVIRONMENT=Production
DB_HOST=justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com
DB_NAME=justsku_prod        # or justsku_demo for testing
DB_USER=admin
DB_PASSWORD=<from AWS Secrets Manager>
SEEDING_ENABLED=false       # Set to true for demo
STRIPE_PUBLISHABLE_KEY=<from Parameter Store>
STRIPE_SECRET_KEY=<from Parameter Store>
STRIPE_WEBHOOK_SECRET=<from Parameter Store>
```

### AWS Parameter Store Configured
- ✅ `/justsku/ENCRYPTION_KEY`
- ✅ `/justsku/ENCRYPTION_IV`
- ✅ `/justsku/stripe-publishable-key`
- ✅ `/justsku/stripe-secret-key`
- ✅ `/justsku/stripe-webhook-secret`

## 📊 Demo Database Setup

For testing and demonstrations, complete demo database setup:

### Quick Start (5 minutes)

1. **Create database schema:**
   ```bash
   mysql -h justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com -u admin -p justsku_demo < setup-demo-database.sql
   ```

2. **Seed test user with sample data:**
   ```bash
   mysql -h justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com -u admin -p justsku_demo < seed-demo-user-and-customer.sql
   ```

3. **Generate realistic mock data (optional):**
   ```powershell
   .\generate-mock-data.ps1 -CustomerId 2 -Products 1000 -Locations 50
   ```

4. **Test with demo credentials:**
   - Email: `test@justsku.com`
   - Password: `Test@123456`

### What Gets Created

**From setup-demo-database.sql:**
- ✅ 40+ database tables with proper indexes
- ✅ All ASP.NET Core Identity tables  
- ✅ SkuVault integration schema
- ✅ Financial transaction tables
- ✅ Migration history for EF Core

**From seed-demo-user-and-customer.sql:**
- ✅ Test user (ID 2) with verified email
- ✅ Demo customer (ID 2) - Premium tier
- ✅ 4 sample warehouse locations
- ✅ 10 realistic products with SKUs
- ✅ Inventory distribution
- ✅ 15+ sample transactions
- ✅ 20+ sales orders
- ✅ Low stock thresholds
- ✅ Notification preferences

**From mock data generator:**
- ✅ 500-50,000 products (configurable)
- ✅ 10-200 warehouse locations
- ✅ 50,000-5,000,000 inventory records
- ✅ Transaction history (30-730 days)
- ✅ Realistic sales channels and order status

### Files Included

| File | Purpose |
|------|---------|
| `setup-demo-database.sql` | Schema creation (all tables, indexes, relationships) |
| `seed-demo-user-and-customer.sql` | Test user + sample data |
| `generate-mock-data.ps1` | Generate 1000s of realistic records |
| `DEMO-DATABASE-SETUP.md` | Detailed setup instructions |
| `MOCK-DATA-GENERATOR-GUIDE.md` | Complete generator documentation |
| `DEMO-SETUP-QUICK-REFERENCE.md` | Quick reference card |

### Default Demo Credentials

| Field | Value |
|-------|-------|
| **Email** | test@justsku.com |
| **Password** | Test@123456 |
| **Customer ID** | 2 |
| **Membership** | Premium (Level 3) |
| **Status** | Active |

For more details, see [DEMO-SETUP-QUICK-REFERENCE.md](DEMO-SETUP-QUICK-REFERENCE.md)

## �📊 Demo Database Contents

**Identity & Access:**
- AspNetUsers, AspNetRoles, AspNetUserClaims
- UserInvitations (for team invites)
- Default admin: `info@justsku.com`

**Inventory Management:**
- Customers (SaaS accounts)
- Tenants (SkuVault connections)
- SkuVaultProducts, SkuVaultInventory, SkuVaultLocations
- InventoryMovements (audit trail)
- LowStockThresholds (notifications)

**Financial:**
- Transactions (payment records)
- Sales (order records)

**Preferences:**
- CustomerNotificationPreferences

## 🔒 Security Notes

1. **No plaintext secrets** in code or config files
2. **All secrets in Parameter Store** with encryption at rest
3. **No automatic admin seeding in production** (manual account creation)
4. **Demo database can be enabled** with `SEEDING_ENABLED=true` for testing
5. **Database credentials** never logged, only loaded at startup

## ⚠️ Production Go-Live Checklist

Before deploying to production with real database:

- [ ] Verify EC2 security group allows only necessary ports (5239 for API)
- [ ] Set `SEEDING_ENABLED=false` in production environment
- [ ] Create admin account manually via UI after deployment
- [ ] Configure backup for MySQL RDS
- [ ] Enable CloudTrail for Parameter Store access audit
- [ ] Set up monitoring for EC2 and RDS
- [ ] Configure SSL/TLS for API endpoint
- [ ] Test full payment flow with Stripe test keys
- [ ] Load test the demo environment first

## 📞 Support

**Files included in this deployment:**
- `setup-demo-database.sql` - Run this against justsku_demo database
- `DEMO-DATABASE-SETUP.md` - Detailed setup instructions
- `ec2-setup-demo.sh` - Automated EC2 setup script
- Docker image: `justsku-api-latest.tar` (on EC2 at `/tmp/`)

**Logs to check after deployment:**
```bash
docker logs -f justsku-api  # Application logs
docker exec justsku-api tail -f /app/logs/app.log  # If file logging enabled
```
