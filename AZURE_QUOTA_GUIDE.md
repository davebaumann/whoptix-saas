# Azure Free Tier Quota Request Guide

## Issue: Free VM Quota Limit is 0

Your Azure account currently has:
- **Current Limit (Free VMs): 0**
- **Required for deployment: 1**

This is normal for new Azure accounts. Here's how to fix it:

## Option 1: Request Quota Increase (Recommended)

### Step 1: Open Azure Portal
1. Go to https://portal.azure.com
2. Sign in with dcbaumann@hotmail.com

### Step 2: Request Quota Increase
1. Search for "Quotas" in the top search bar
2. Click on "Quotas" service
3. Click "My quotas" 
4. Filter by:
   - **Service**: App Service
   - **Location**: East US
5. Find "Free App Service Plan instances" 
6. Click the quota item
7. Click "Request quota increase"
8. Set **New limit** to: 1
9. Add business justification: "Setting up web application for business use"
10. Submit the request

### Step 3: Wait for Approval
- Usually approved within 24-48 hours
- You'll receive email notification
- Then you can run the deployment script

## Option 2: Try Different Resource Types

### Azure Container Instances (Alternative)
```powershell
# Try Container Instances instead (may have different quotas)
$azCli = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
& $azCli container create `
    --name whoptix-api `
    --resource-group whoptix-rg `
    --image mcr.microsoft.com/dotnet/aspnet:8.0 `
    --dns-name-label whoptix-api-$(Get-Random) `
    --ports 80
```

### Azure Static Web Apps (For frontend only)
```powershell
# Deploy frontend as static web app (free tier available)
& $azCli staticwebapp create `
    --name whoptix-frontend `
    --resource-group whoptix-rg `
    --location eastus2
```

## Option 3: Use Paid Tier (Small cost)

### Basic B1 Tier ($13.14/month)
```powershell
# Create with Basic tier (bypasses free quota)
& $azCli appservice plan create `
    --name whoptix-basic-plan `
    --resource-group whoptix-rg `
    --sku B1 `
    --is-linux
```

## Current Status

✅ **Azure Account**: Active (dcbaumann@hotmail.com)
✅ **Resource Group**: whoptix-rg (created)
❌ **Free VM Quota**: 0 (needs increase)
✅ **Application**: Built and ready to deploy

## Recommended Next Steps

1. **Request quota increase** (Option 1) - Best for truly free hosting
2. **Or try Basic B1 tier** (Option 3) - Small cost but immediate deployment
3. **Wait for approval** then run: `.\deploy-azure-free-working.ps1`

## Alternative: Use Different Cloud Provider

If Azure quotas are problematic:
- **Heroku**: Has free tier options
- **Railway**: Free tier available  
- **Render**: Free tier for web services
- **DigitalOcean**: App Platform with free allowance

Would you like me to help with the quota request or explore other deployment options?