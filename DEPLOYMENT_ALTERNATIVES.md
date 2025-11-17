# Railway Deployment Guide for Whoptix

## Prerequisites
1. GitHub account
2. Railway account (free $5 credit monthly)

## Step 1: Prepare Your Repository

### Push to GitHub:
```powershell
# Initialize git if needed
git init
git add .
git commit -m "Initial commit for Railway deployment"

# Add GitHub remote (replace with your repo)
git remote add origin https://github.com/yourusername/whoptix-saas.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Railway

### Quick Setup:
1. Go to **https://railway.app**
2. **Sign up/Login** with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose your **Whoptix repository**
6. Railway will auto-detect the .NET project

### Environment Variables:
In Railway dashboard, add these environment variables:
```
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=Server=davidbaumann.pro;Database=dbayd5xzdn55n8;User=u41gecrgnxvqt;Password=skuvault_db_admin;SslMode=Required;Port=3306
```

### Custom Build (if needed):
Create `railway.toml` in project root:
```toml
[build]
builder = "nixpacks"
buildCommand = "dotnet publish -c Release -o out backend/SkuVaultSaaS.Api/"

[deploy]
startCommand = "cd out && dotnet SkuVaultSaaS.Api.dll"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

## Alternative: Render.com Deployment

### Render Setup:
1. Go to **https://render.com**
2. **Sign up** with GitHub
3. Click **"New +"** → **"Web Service"**
4. Connect GitHub repository
5. Configure:
   - **Build Command**: `dotnet publish -c Release -o out backend/SkuVaultSaaS.Api/`
   - **Start Command**: `cd out && dotnet SkuVaultSaaS.Api.dll`
   - **Environment**: Add the connection string above

## Alternative: Back to Azure with Proper Support Request

### Azure Support Request Steps:
1. **Azure Portal** → **Help + Support**
2. **Create support request**
3. **Issue type**: Service and subscription limits (quotas)
4. **Problem type**: Compute-VM (cores-vCPUs) subscription limit increases  
5. **Details**:
   ```
   Subject: Request quota increase for App Service Free tier
   
   Description: I need to increase my quota for Free App Service Plan instances from 0 to 1 in the East US region to deploy a web application for my business.
   
   Current limit: 0
   Requested limit: 1
   Region: East US
   Resource type: App Service Plan (F1 Free tier)
   ```

## My Recommendation: Railway

**Railway is probably your best bet** because:
- ✅ **$5 free credit monthly** (covers small apps)
- ✅ **Easy GitHub integration**
- ✅ **Good .NET support**
- ✅ **No sleep/wake delays**
- ✅ **Custom domains**

Would you like me to:
1. **Help set up Railway deployment**
2. **Help with Azure support request**  
3. **Try Render.com instead**

Which option sounds best to you?