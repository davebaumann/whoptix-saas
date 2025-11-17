# Azure Deployment Guide for Whoptix

## Prerequisites
✅ Azure account created  
✅ Azure CLI installed  
✅ Logged in to Azure  
✅ Resource group created: `whoptix-rg`

## Quota Issue Resolution

Your Azure subscription appears to have default quota limits. Here are your options:

### Option 1: Request Quota Increase (Recommended)
1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "Quotas"
3. Select "Compute" quotas
4. Find "Basic VMs" or "Standard VMs" 
5. Request limit increase to at least 2-4 VMs
6. Wait for approval (usually 1-24 hours)

### Option 2: Use Azure Portal Manual Setup (Immediate)
While waiting for quota, set up manually through portal:

## Manual Azure Portal Setup Steps

### 1. Create MySQL Database
1. Go to [Azure Portal](https://portal.azure.com)
2. Create Resource → Databases → Azure Database for MySQL
3. Choose "Flexible server" 
4. Resource group: `whoptix-rg`
5. Server name: `whoptix-mysql-server`
6. Location: East US
7. MySQL version: 8.0
8. Compute tier: Burstable (B1ms) - cheapest option
9. Storage: 20 GB
10. Create admin username/password (save these!)
11. Configure firewall to allow Azure services

### 2. Create App Service for Backend API
1. Create Resource → Web → App Service
2. Resource group: `whoptix-rg`
3. Name: `whoptix-api`
4. Runtime: .NET 8 (LTS)
5. Operating system: Windows
6. Region: East US
7. App Service Plan: Create new with F1 (Free) tier
8. Create the service

### 3. Create Static Web App for Frontend
1. Create Resource → Web → Static Web App
2. Resource group: `whoptix-rg`  
3. Name: `whoptix-frontend`
4. Plan: Free tier
5. Region: East US 2
6. Deployment source: Other (we'll upload manually)

## Configuration After Creation

### Backend App Service Settings
Add these Application Settings in your App Service:

```
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=Server=whoptix-mysql-server.mysql.database.azure.com;Database=whoptix;Uid=your_admin_user;Pwd=your_admin_password;SslMode=Required
VITE_API_BASE_URL=https://whoptix-api.azurewebsites.net
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key_here
```

### Database Setup
1. Connect to your MySQL server using MySQL Workbench or Azure Cloud Shell
2. Create database: `CREATE DATABASE whoptix;`
3. Run your Entity Framework migrations
4. Apply the MembershipLevel column SQL script

## Deployment Methods

### Backend Deployment
1. **Visual Studio**: Right-click project → Publish → Azure App Service
2. **CLI** (once quota approved): `az webapp deploy`
3. **GitHub Actions**: Set up CI/CD pipeline

### Frontend Deployment  
1. Build the React app: `npm run build`
2. Upload the `dist` folder to Static Web App
3. Or use GitHub Actions for continuous deployment

## Cost Estimate (Monthly)
- App Service (F1 Free): $0
- Static Web App (Free): $0  
- MySQL Flexible Server (B1ms): ~$25-35
- **Total**: ~$25-35/month

## Next Steps After Quota Approval
1. Create App Service Plan with B1 tier for better performance
2. Scale MySQL if needed
3. Set up custom domains
4. Configure SSL certificates
5. Set up monitoring and alerts

## Support Links
- [Azure Quota Requests](https://portal.azure.com/#view/Microsoft_Azure_Capacity/QuotaMenuBlade/~/myQuotas)
- [App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [MySQL Flexible Server](https://docs.microsoft.com/en-us/azure/mysql/flexible-server/)