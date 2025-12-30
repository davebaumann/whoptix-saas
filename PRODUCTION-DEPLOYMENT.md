# Production Deployment Guide - SkuVaultSaaS

## Overview
This guide walks through preparing and deploying the SkuVaultSaaS application to production. The architecture consists of:
- **Backend**: .NET 8 ASP.NET Core API
- **Frontend**: React 18 + TypeScript SPA
- **Database**: MySQL (hosted on ftp.davidbaumann.pro)
- **Hosting**: Azure App Service (recommended) or equivalent cloud provider

---

## Phase 1: Pre-Deployment Verification

### ✅ Code Quality & Testing

1. **Verify all code builds successfully**
```powershell
cd backend
dotnet clean
dotnet build -c Release
```

2. **Verify frontend builds successfully**
```powershell
cd frontend
npm install
npm run build
```
The output should be in `frontend/dist/` with no TypeScript errors.

3. **Run code analysis**
```powershell
# Check for obvious issues
dotnet build -c Release /p:TreatWarningsAsErrors=true
```

### ✅ Database Schema Validation

1. **Ensure all migrations are applied**
   - Check `backend/SkuVaultSaaS.Infrastructure/Migrations/` directory
   - Verify latest migration includes all required tables and columns:
     - `Customers` (MembershipLevel, IsActive, CancellationDate, CancellationReason, etc.)
     - `Users` (2FA columns: TwoFactorEnabled, TwoFactorSecret, etc.)
     - `Transactions`, `InventoryMovements`, `Products`, `Locations`, `Tenants`
     - `InventoryLevels`, `LowStockProducts`, `Shipments`

2. **Production database schema**
```sql
-- Verify database exists and is accessible
SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'skuvault_prod';

-- Check key tables exist
SHOW TABLES LIKE 'Customers';
SHOW TABLES LIKE 'Users';
SHOW TABLES LIKE 'Transactions';
```

### ✅ Configuration Review

1. **Check appsettings.Production.json**
   - Verify all `${ENV_VAR}` placeholders are identified
   - Ensure no hardcoded secrets present
   - Review all settings:
     ```json
     {
       "ConnectionStrings": { "DefaultConnection": "Server=...;Database=${DB_NAME};..." },
       "Encryption": { "Key": "${ENCRYPTION_KEY}", "IV": "${ENCRYPTION_IV}" },
       "Stripe": { "SecretKey": "${STRIPE_SECRET_KEY}", ... },
       "EmailSettings": { "Password": "${EMAIL_PASSWORD}", ... },
       "Logging": { "LogLevel": { "Default": "Warning" } }
     }
     ```

2. **Verify frontend configuration**
   - Check `frontend/src/api/` services for correct API_BASE_URL
   - Ensure no development/localhost URLs in production build

### ✅ Security Checklist

- [ ] HTTPS enabled on all endpoints
- [ ] CORS policy restricted to production domain(s) only
- [ ] No debug endpoints or test routes exposed
- [ ] All secrets removed from code and config files
- [ ] Default/test credentials (admin@example.com) should NOT be seeded in production
- [ ] Logging level set to "Warning" or higher (no verbose debug logs)
- [ ] Email notifications configured and tested
- [ ] Stripe keys are production keys (not test keys)
- [ ] Database connection uses SSL/TLS
- [ ] API rate limiting configured

---

## Phase 2: Azure Deployment Setup

### Prerequisites
- Azure account with active subscription
- Azure CLI installed: `az --version`
- Logged into Azure: `az login`
- Resource group created: `justsku-rg`

### 2A: Create MySQL Database

```powershell
# Variables
$resourceGroup = "justsku-rg"
$location = "East US"
$serverName = "justsku-mysql-prod"
$adminUser = "justskuloadmin"
$adminPassword = "YourSecurePassword123!"  # CHANGE THIS

# Create MySQL Flexible Server
az mysql flexible-server create `
  --resource-group $resourceGroup `
  --name $serverName `
  --location $location `
  --admin-user $adminUser `
  --admin-password $adminPassword `
  --sku-name "Standard_B1ms" `
  --tier "Burstable" `
  --storage-size 20 `
  --version "8.0" `
  --high-availability "Disabled" `
  --backup-retention 7

# Save connection info
# Server: justsku-mysql-prod.mysql.database.azure.com
# Admin: justskuloadmin
# Password: (use your password above)
```

### 2B: Create App Service for Backend

```powershell
$resourceGroup = "justsku-rg"
$appServiceName = "justsku-api-prod"
$planName = "justsku-plan-prod"
$location = "East US"

# Create App Service Plan
az appservice plan create `
  --resource-group $resourceGroup `
  --name $planName `
  --sku B1 `
  --is-linux false

# Create App Service
az webapp create `
  --resource-group $resourceGroup `
  --plan $planName `
  --name $appServiceName `
  --runtime "DOTNET|8.0"

# Save App Service URL: https://justsku-api-prod.azurewebsites.net
```

### 2C: Create Static Web App for Frontend

```powershell
$resourceGroup = "justsku-rg"
$appName = "justsku-app-prod"
$location = "eastus"

# Create Static Web App
az staticwebapp create `
  --name $appName `
  --resource-group $resourceGroup `
  --location $location `
  --sku Free

# Save Static Web App URL: https://justsku-app-prod.azurestaticapps.net
```

---

## Phase 3: Environment Variables & Secrets

### 3A: Generate Encryption Keys

```powershell
# Install openssl or use WSL2 for Linux commands
# For ENCRYPTION_KEY (32 bytes, base64 encoded)
openssl rand -base64 32

# For ENCRYPTION_IV (16 bytes, hex encoded)
openssl rand -hex 16

# Example output:
# ENCRYPTION_KEY: "aB1c2D3e4F5g6H7i8J9k0L1m2N3o4P5q="
# ENCRYPTION_IV: "aB1c2D3e4F5g6H7i8J9k"
```

**Save these values securely** - you'll need them for App Service configuration.

### 3B: Configure App Service Settings

```powershell
$resourceGroup = "justsku-rg"
$appName = "justsku-api-prod"

# Get MySQL connection string
$dbServer = "justsku-mysql-prod.mysql.database.azure.com"
$dbUser = "justskuloadmin"
$dbPassword = "YourSecurePassword123!"
$dbName = "skuvault_prod"
$connectionString = "Server=$dbServer;Database=$dbName;User=$dbUser;Password=$dbPassword;SslMode=Required;Port=3306;"

# Set app settings (one at a time or via JSON)
az webapp config appsettings set `
  --resource-group $resourceGroup `
  --name $appName `
  --settings `
    ASPNETCORE_ENVIRONMENT="Production" `
    "ConnectionStrings__DefaultConnection=$connectionString" `
    DB_NAME="skuvault_prod" `
    DB_USER="$dbUser" `
    DB_PASSWORD="$dbPassword" `
    ENCRYPTION_KEY="your_base64_32_byte_key_here" `
    ENCRYPTION_IV="your_hex_16_byte_iv_here" `
    STRIPE_PUBLISHABLE_KEY="pk_live_your_key_here" `
    STRIPE_SECRET_KEY="sk_live_your_key_here" `
    STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here" `
    EMAIL_PASSWORD="your_email_password_here" `
    "VITE_API_BASE_URL=https://justsku-api-prod.azurewebsites.net"
```

**Alternative: Using Azure Key Vault (Recommended)**
```powershell
# Create Key Vault
az keyvault create --name justsku-kv --resource-group $resourceGroup --location "East US"

# Store secrets
az keyvault secret set --vault-name justsku-kv --name "db-password" --value $dbPassword
az keyvault secret set --vault-name justsku-kv --name "encryption-key" --value $encryptionKey
az keyvault secret set --vault-name justsku-kv --name "stripe-secret-key" --value $stripeSecretKey

# Grant App Service access to Key Vault
az webapp identity assign --resource-group $resourceGroup --name $appName
```

---

## Phase 4: Database Initialization

### 4A: Create Production Database

```sql
-- Connect to MySQL server at justsku-mysql-prod.mysql.database.azure.com
-- Using admin user: justskuloadmin

-- Create database
CREATE DATABASE IF NOT EXISTS skuvault_prod;
USE skuvault_prod;

-- Run Entity Framework migrations (from Visual Studio or CLI)
-- Via Azure Cloud Shell:
dotnet ef database update --connection "Server=justsku-mysql-prod.mysql.database.azure.com;Database=skuvault_prod;User=justskuloadmin;Password=XXX;SslMode=Required;" --project SkuVaultSaaS.Infrastructure
```

### 4B: Apply Initial Schema & Seed Data

```sql
-- Verify tables created by EF migrations
SHOW TABLES;

-- DO NOT seed default admin accounts in production
-- (SeedDatabase should be false in Production appsettings)

-- Create admin user manually if needed
INSERT INTO AspNetUsers (Id, UserName, Email, EmailConfirmed, NormalizedUserName, NormalizedEmail, PasswordHash, SecurityStamp, ConcurrencyStamp, PhoneNumber, PhoneNumberConfirmed, TwoFactorEnabled, LockoutEnd, LockoutEnabled, AccessFailedCount)
VALUES (
  UUID(),
  'admin@yourdomain.com',
  'admin@yourdomain.com',
  1,
  'ADMIN@YOURDOMAIN.COM',
  'ADMIN@YOURDOMAIN.COM',
  'BCrypt_Hash_Here', -- Use a secure password hash generator
  UUID(),
  UUID(),
  NULL,
  0,
  0,
  NULL,
  1,
  0
);
```

---

## Phase 5: Backend Deployment

### 5A: Build Release Package

```powershell
cd backend\SkuVaultSaaS.Api

# Clean and build for Release
dotnet clean -c Release
dotnet publish -c Release -o ../../../publish-prod

# Output will be in publish-prod/ ready for deployment
```

### 5B: Deploy to Azure App Service

**Option 1: Using Azure CLI**
```powershell
$resourceGroup = "justsku-rg"
$appName = "justsku-api-prod"
$publishPath = "publish-prod"

# Compress the publish folder
Compress-Archive -Path $publishPath -DestinationPath deploy.zip -Force

# Deploy
az webapp deployment source config-zip `
  --resource-group $resourceGroup `
  --name $appName `
  --src deploy.zip
```

**Option 2: Using Visual Studio**
1. Right-click `SkuVaultSaaS.Api` project
2. Select "Publish"
3. Choose "Azure App Service"
4. Select subscription and `justsku-api-prod`
5. Click "Publish"

### 5C: Verify Backend Deployment

```powershell
# Test API health endpoint
$apiUrl = "https://justsku-api-prod.azurewebsites.net"
Invoke-WebRequest "$apiUrl/api/health" -Method Get

# Check logs
az webapp log tail --resource-group justsku-rg --name justsku-api-prod
```

---

## Phase 6: Frontend Deployment

### 6A: Build Frontend for Production

```powershell
cd frontend

# Clean install
rm -r node_modules dist
npm install

# Build with production optimizations
npm run build

# Verify dist/ folder is created with minified assets
```

### 6B: Deploy to Azure Static Web App

```powershell
$resourceGroup = "justsku-rg"
$appName = "justsku-app-prod"
$distFolder = "dist"

# Method 1: Using Azure CLI
az staticwebapp upload `
  --name $appName `
  --source $distFolder `
  --resource-group $resourceGroup

# Method 2: Deploy to folder
az webapp deployment source config-zip `
  --resource-group $resourceGroup `
  --name $appName `
  --src (Compress-Archive $distFolder)
```

### 6C: Configure Static Web App Settings

```powershell
# Create staticwebapp.config.json for routing
# (Place in frontend/ directory before build)
```

**staticwebapp.config.json:**
```json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    },
    {
      "route": "/*",
      "serve": "/index.html",
      "statusCode": 200
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/images/*", "/css/*"]
  },
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html"
    }
  }
}
```

### 6D: Configure CORS on Backend

Ensure backend allows frontend domain:

**appsettings.Production.json or via environment variable:**
```json
"Cors": {
  "AllowedOrigins": ["https://justsku-app-prod.azurestaticapps.net"],
  "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "AllowedHeaders": ["Content-Type", "Authorization"]
}
```

---

## Phase 7: Post-Deployment Verification

### ✅ Test API Endpoints

```powershell
$apiUrl = "https://justsku-api-prod.azurewebsites.net"

# Test health
Invoke-WebRequest "$apiUrl/api/health"

# Test authentication (if public)
Invoke-WebRequest "$apiUrl/api/auth/login" -Method Post -Body @{email="test@test.com"} -ContentType "application/json"
```

### ✅ Test Frontend Application

1. Navigate to: `https://justsku-app-prod.azurestaticapps.net`
2. Verify page loads without 404 errors
3. Check browser console for API errors
4. Test login flow with test account
5. Verify reports load correctly
6. Test Stripe payment flow in test mode

### ✅ Database Verification

```sql
-- Verify production database is being used
SELECT COUNT(*) as customer_count FROM Customers;
SELECT COUNT(*) as user_count FROM AspNetUsers;

-- Check replication/backup status
SHOW MASTER STATUS;
```

### ✅ Monitoring & Logging

```powershell
# View application logs
az webapp log tail --resource-group justsku-rg --name justsku-api-prod

# Monitor App Service metrics
az monitor metrics list --resource /subscriptions/{id}/resourceGroups/justsku-rg/providers/Microsoft.Web/sites/justsku-api-prod
```

---

## Phase 8: Post-Deployment Configuration

### 8A: Configure Email Notifications

Verify low-stock and membership notifications work:
```powershell
# Test email by triggering low-stock check
# Monitor logs to confirm emails are sent
az webapp log tail --resource-group justsku-rg --name justsku-api-prod | Select-String "Email"
```

### 8B: Configure Stripe Webhooks

```bash
# Using Stripe CLI (for production):
stripe listen --forward-to https://justsku-api-prod.azurewebsites.net/api/stripe/webhook
```

Or configure via Stripe Dashboard:
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://justsku-api-prod.azurewebsites.net/api/stripe/webhook`
3. Select events: `payment_intent.succeeded`, `customer.subscription.updated`, `invoice.payment_succeeded`
4. Copy webhook signing secret to environment variable `STRIPE_WEBHOOK_SECRET`

### 8C: Setup Automated Backups

```powershell
# Enable automatic backups for MySQL
az mysql flexible-server backup create `
  --resource-group justsku-rg `
  --name justsku-mysql-prod `
  --backup-name daily-backup

# Configure backup retention (7 days default)
az mysql flexible-server update `
  --resource-group justsku-rg `
  --name justsku-mysql-prod `
  --backup-retention 30
```

---

## Phase 9: Security Hardening

### 9A: Enable HTTPS & SSL

- ✅ Azure App Service automatically provides HTTPS
- Configure custom domain with SSL certificate
- Enforce HTTPS redirect in appsettings.json

### 9B: Configure WAF (Web Application Firewall)

```powershell
# Create Azure Front Door with WAF rules
az network front-door create `
  --resource-group justsku-rg `
  --name justsku-waf `
  --backend-address justsku-api-prod.azurewebsites.net
```

### 9C: Database Security

- ✅ Firewall rules configured to allow only App Service
- ✅ Connection uses SSL/TLS
- ✅ Credentials stored in Azure Key Vault
- Regular security updates enabled

### 9D: API Security

- [ ] Rate limiting configured
- [ ] CORS restricted to production domain
- [ ] Authentication required for sensitive endpoints
- [ ] API key validation implemented
- [ ] Input validation on all endpoints

---

## Phase 10: Monitoring & Maintenance

### 10A: Setup Application Insights

```powershell
az monitor app-insights component create `
  --resource-group justsku-rg `
  --app justsku-insights `
  --location "East US"

# Link to App Service
az webapp config appsettings set `
  --resource-group justsku-rg `
  --name justsku-api-prod `
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="your_key_here"
```

### 10B: Configure Alerts

```powershell
# Alert on high error rate
az monitor metrics alert create `
  --resource-group justsku-rg `
  --scopes /subscriptions/{id}/resourceGroups/justsku-rg/providers/Microsoft.Web/sites/justsku-api-prod `
  --condition "avg HTTP5xx > 5" `
  --window-size 5m `
  --evaluation-frequency 1m
```

### 10C: Regular Maintenance Schedule

- **Daily**: Check logs for errors
- **Weekly**: Verify backups completed
- **Monthly**: Review security patches and updates
- **Quarterly**: Update dependencies and libraries
- **Annually**: Security audit and penetration testing

---

## Troubleshooting

### Issue: API returns 500 errors

**Solution:**
```powershell
# Check application logs
az webapp log tail --resource-group justsku-rg --name justsku-api-prod

# Verify database connectivity
# Check connection string and credentials in App Service settings
```

### Issue: Frontend can't reach API

**Solution:**
1. Verify CORS settings in backend
2. Check API URL in frontend environment
3. Verify API is actually running: `https://api-url/api/health`

### Issue: Database connection fails

**Solution:**
1. Verify MySQL server is running
2. Check firewall rules allow App Service
3. Verify connection string format
4. Test connection: `mysql -h server.mysql.database.azure.com -u user -p`

### Issue: Stripe payments not working

**Solution:**
1. Verify production Stripe keys are set (not test keys)
2. Confirm webhook endpoint is configured
3. Check webhook signing secret matches
4. Review Stripe dashboard for webhook failures

---

## Rollback Plan

If deployment fails:

1. **Revert to previous version:**
```powershell
az webapp deployment slot swap --resource-group justsku-rg --name justsku-api-prod --slot staging
```

2. **Restore database from backup:**
```powershell
# List available backups
az mysql flexible-server restore list --resource-group justsku-rg --name justsku-mysql-prod

# Restore from backup
az mysql flexible-server restore `
  --resource-group justsku-rg `
  --name justsku-mysql-prod-restored `
  --restore-from-backup "backup-id"
```

---

## Go-Live Checklist

- [ ] All code reviewed and approved
- [ ] Database migrations applied to production
- [ ] Environment variables configured
- [ ] API deployed and tested
- [ ] Frontend deployed and tested
- [ ] Stripe webhooks configured
- [ ] Email notifications tested
- [ ] Backups configured
- [ ] Monitoring and alerting enabled
- [ ] Security audit completed
- [ ] Staff trained on system
- [ ] Support documentation ready
- [ ] Rollback plan documented

---

## Contact & Support

For issues during deployment:
1. Check Azure Portal for app service logs
2. Review Application Insights for exceptions
3. Check database logs for connectivity issues
4. Contact cloud provider support if infrastructure issue

