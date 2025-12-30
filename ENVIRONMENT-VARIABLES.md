# Production Environment Variables Reference

This document defines all environment variables required for production deployment.

---

## Database Configuration

| Variable | Value | Notes |
|----------|-------|-------|
| `DB_NAME` | `skuvault_prod` | Production database name |
| `DB_USER` | `justskuloadmin` | MySQL admin user (not from connection string) |
| `DB_PASSWORD` | `{secure_password}` | MySQL admin password |
| `ConnectionStrings__DefaultConnection` | `Server=justsku-mysql-prod.mysql.database.azure.com;Database=skuvault_prod;User=justskuloadmin;Password={DB_PASSWORD};SslMode=Required;Port=3306;Pooling=true;` | Full connection string - auto-built from components |

---

## Encryption Configuration

These are CRITICAL for protecting sensitive data in the database.

| Variable | Format | Example | Notes |
|----------|--------|---------|-------|
| `ENCRYPTION_KEY` | Base64 (32 bytes) | `aB1c2D3e4F5g6H7i8J9k0L1m2N3o4P5q=` | Generate with: `openssl rand -base64 32` |
| `ENCRYPTION_IV` | Hex (16 bytes) | `aB1c2D3e4F5g6H7i8J9k` | Generate with: `openssl rand -hex 16` |

⚠️ **IMPORTANT**: Keep these values secure. Changing them will make existing encrypted data unreadable.

---

## Stripe Configuration

| Variable | Value | Notes |
|----------|-------|-------|
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Production publishable key (starts with `pk_live_`) |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Production secret key (starts with `sk_live_`) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Webhook signing secret for verifying webhook authenticity |

To find these in Stripe:
1. Login to Stripe Dashboard
2. Navigate to Developers → API Keys
3. Copy Live keys (not Test keys)
4. For webhook secret: Developers → Webhooks → Select endpoint → Signing secret

---

## Email Configuration

| Variable | Value | Notes |
|----------|-------|-------|
| `SMTP_HOST` | `mail.davidbaumann.pro` | Email server hostname |
| `SMTP_PORT` | `465` | SMTP port (465 for TLS, 587 for STARTTLS) |
| `SMTP_USER` | `app@davidbaumann.pro` | Email account username |
| `SMTP_PASSWORD` | `{secure_password}` | Email account password |
| `SMTP_FROM_EMAIL` | `app@davidbaumann.pro` | From address for outgoing emails |
| `SMTP_FROM_NAME` | `JUSTSKU Production` | From name in email headers |
| `SMTP_USE_SSL` | `true` | Use TLS/SSL encryption |

---

## Application Settings

| Variable | Value | Notes |
|----------|-------|-------|
| `ASPNETCORE_ENVIRONMENT` | `Production` | Environment mode (affects logging, caching, features) |
| `ASPNETCORE_URLS` | `https://+:443` | HTTPS only in production |

---

## API Configuration

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_BASE_URL` | `https://justsku-api-prod.azurewebsites.net` | Backend API URL for frontend |
| `API_PORT` | `5239` | API port (Azure App Service ignores this) |

---

## Sync Settings

| Variable | Value | Notes |
|----------|-------|-------|
| `SyncSettings__Enabled` | `true` | Enable SkuVault data sync |
| `SyncSettings__IntervalMinutes` | `60` | How often to sync full data |
| `SyncSettings__TransactionsMinutes` | `15` | How often to check for new transactions |
| `SyncSettings__InventoryMinutes` | `30` | How often to sync inventory levels |
| `SyncSettings__ProductsMinutes` | `60` | How often to sync product data |
| `SyncSettings__LocationsMinutes` | `120` | How often to sync locations |

---

## Low Stock Notifications

| Variable | Value | Notes |
|----------|-------|-------|
| `LowStockNotificationSettings__IsEnabled` | `true` | Enable low-stock notifications |
| `LowStockNotificationSettings__IntervalMinutes` | `240` | Check for low stock every 4 hours |
| `LowStockNotificationSettings__NotificationEmails` | `admin@yourdomain.com` | Comma-separated list of notification recipients |

---

## Logging

| Variable | Value | Notes |
|----------|-------|-------|
| `Logging__LogLevel__Default` | `Warning` | Only log warnings and errors |
| `Logging__LogLevel__Microsoft.AspNetCore` | `Warning` | Reduce ASP.NET Core verbosity |
| `Logging__LogLevel__Microsoft.EntityFrameworkCore` | `Warning` | Reduce EF Core verbosity |

---

## CORS Configuration

| Variable | Value | Notes |
|----------|-------|-------|
| `CORS__AllowedOrigins` | `https://justsku-app-prod.azurestaticapps.net` | Frontend URL (single origin) |
| `CORS__AllowedMethods` | `GET,POST,PUT,DELETE,OPTIONS` | HTTP methods allowed |
| `CORS__AllowedHeaders` | `Content-Type,Authorization` | Headers allowed in requests |

---

## Azure Key Vault (Optional but Recommended)

Instead of setting environment variables directly, use Azure Key Vault:

| Variable | Value | Notes |
|----------|-------|-------|
| `KEYVAULT_URL` | `https://justsku-kv.vault.azure.net/` | Key Vault URL |
| `KeyVault__VaultUri` | `https://justsku-kv.vault.azure.net/` | Alternative format |

Then grant App Service managed identity access to Key Vault:
```powershell
az keyvault set-policy --name justsku-kv --object-id {app-service-principal-id} --secret-permissions get list
```

---

## Deployment to Azure App Service

### Via Azure CLI

```powershell
# Set all environment variables at once
az webapp config appsettings set `
  --resource-group justsku-rg `
  --name justsku-api-prod `
  --settings `
    ASPNETCORE_ENVIRONMENT="Production" `
    "ConnectionStrings__DefaultConnection=Server=justsku-mysql-prod.mysql.database.azure.com;Database=skuvault_prod;User=justskuloadmin;Password=YourPassword;SslMode=Required;" `
    DB_NAME="skuvault_prod" `
    DB_USER="justskuloadmin" `
    DB_PASSWORD="YourPassword" `
    ENCRYPTION_KEY="base64EncodedKeyHere" `
    ENCRYPTION_IV="hexEncodedIVHere" `
    STRIPE_PUBLISHABLE_KEY="pk_live_YourKeyHere" `
    STRIPE_SECRET_KEY="sk_live_YourKeyHere" `
    STRIPE_WEBHOOK_SECRET="whsec_YourSecretHere" `
    SMTP_HOST="mail.davidbaumann.pro" `
    SMTP_PORT="465" `
    SMTP_USER="app@davidbaumann.pro" `
    SMTP_PASSWORD="YourEmailPassword" `
    SMTP_FROM_EMAIL="app@davidbaumann.pro" `
    SMTP_FROM_NAME="JUSTSKU Production" `
    SMTP_USE_SSL="true" `
    "VITE_API_BASE_URL=https://justsku-api-prod.azurewebsites.net" `
    "SyncSettings__Enabled=true" `
    "SyncSettings__IntervalMinutes=60" `
    "SyncSettings__TransactionsMinutes=15" `
    "SyncSettings__InventoryMinutes=30" `
    "SyncSettings__ProductsMinutes=60" `
    "SyncSettings__LocationsMinutes=120" `
    "LowStockNotificationSettings__IsEnabled=true" `
    "LowStockNotificationSettings__IntervalMinutes=240" `
    "LowStockNotificationSettings__NotificationEmails=admin@yourdomain.com"
```

### Via Azure Portal

1. Go to Azure Portal → App Service → `justsku-api-prod`
2. Navigate to **Settings** → **Configuration**
3. Click **New application setting**
4. Enter name and value for each variable
5. Click **OK**
6. Click **Save** at the top

---

## Verification Commands

### Check variables are set correctly

```powershell
# List all app settings
az webapp config appsettings list --resource-group justsku-rg --name justsku-api-prod

# Get specific setting
az webapp config appsettings show --resource-group justsku-rg --name justsku-api-prod --setting-name ASPNETCORE_ENVIRONMENT
```

### Test database connection

```powershell
# Via Azure Cloud Shell
mysql -h justsku-mysql-prod.mysql.database.azure.com -u justskuloadmin -p

# Test from app
# Access the app and navigate to a report that uses the database
# Check logs for connection errors:
az webapp log tail --resource-group justsku-rg --name justsku-api-prod
```

### Verify Stripe keys are production keys

```powershell
# Check that keys start with correct prefixes
az webapp config appsettings show --resource-group justsku-rg --name justsku-api-prod --setting-name STRIPE_PUBLISHABLE_KEY

# Should start with "pk_live_" not "pk_test_"
```

---

## Common Issues

### Issue: "Could not decrypt data"

**Cause**: ENCRYPTION_KEY or ENCRYPTION_IV changed  
**Solution**: Use same keys as original deployment. If lost, you must re-encrypt all data (requires manual intervention)

### Issue: "MySQL Connection Failed"

**Cause**: Database connection string, credentials, or firewall issue  
**Solution**: 
1. Verify connection string syntax
2. Test credentials from Azure Cloud Shell
3. Check MySQL firewall allows App Service

### Issue: "Stripe webhook not authenticating"

**Cause**: STRIPE_WEBHOOK_SECRET incorrect  
**Solution**: Copy the signing secret from Stripe Dashboard (not the endpoint ID)

### Issue: "Emails not sending"

**Cause**: SMTP credentials incorrect or email server unreachable  
**Solution**: 
1. Verify SMTP_USER and SMTP_PASSWORD
2. Verify SMTP_HOST and SMTP_PORT
3. Test connection from Azure Cloud Shell: `telnet mail.davidbaumann.pro 465`

---

## Security Best Practices

1. **Never commit `.env` files or environment variables to Git**
2. **Use Azure Key Vault to store secrets** (not App Service settings if possible)
3. **Rotate encryption keys quarterly** (requires data re-encryption)
4. **Rotate Stripe and SMTP passwords regularly**
5. **Use strong passwords** (minimum 20 characters, mix of upper/lower/numbers/symbols)
6. **Limit who has access to environment variables**
7. **Audit access to Key Vault** using Azure Monitor
8. **Enable Azure Security Center** for App Service monitoring

---

## For Local Development

If you need to run locally for testing, create `.env` file in `backend/SkuVaultSaaS.Api/`:

```bash
ASPNETCORE_ENVIRONMENT=Development
ENCRYPTION_KEY=dev_key_not_real
ENCRYPTION_IV=dev_iv_not_real
DB_PASSWORD=dev_password
STRIPE_SECRET_KEY=sk_test_dev_key_not_real
```

⚠️ Never use production values locally. Always use test/dev values.

