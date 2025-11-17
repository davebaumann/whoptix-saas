# Whoptix Azure Free Tier Deployment Script
# Uses only free tier resources to minimize costs

$ErrorActionPreference = "Stop"
$resourceGroup = "whoptix-free-rg"
$location = "eastus"
$appServicePlan = "whoptix-free-plan"
$apiAppName = "whoptix-api-free"
$staticAppName = "whoptix-frontend-free"

Write-Host "🆓 Starting Whoptix Free Tier Azure Deployment..." -ForegroundColor Green

# Check if logged in
try {
    $account = az account show 2>$null | ConvertFrom-Json
    Write-Host "✅ Logged in as: $($account.user.name)" -ForegroundColor Green
} catch {
    Write-Host "❌ Please login to Azure first: az login" -ForegroundColor Red
    exit 1
}

# Check for existing resource group
$existingRG = az group show --name $resourceGroup 2>$null
if ($existingRG) {
    Write-Host "✅ Using existing resource group: $resourceGroup" -ForegroundColor Green
} else {
    Write-Host "📋 Creating resource group: $resourceGroup..." -ForegroundColor Yellow
    az group create --name $resourceGroup --location $location
    Write-Host "✅ Resource group created" -ForegroundColor Green
}

# Create App Service Plan using Free tier (F1)
Write-Host "📋 Creating Free Tier App Service Plan..." -ForegroundColor Yellow
az appservice plan create `
    --name $appServicePlan `
    --resource-group $resourceGroup `
    --sku F1 `
    --is-linux

Write-Host "✅ Free App Service Plan created" -ForegroundColor Green

# Create API App Service
Write-Host "🔧 Creating API App Service..." -ForegroundColor Yellow
az webapp create `
    --name $apiAppName `
    --resource-group $resourceGroup `
    --plan $appServicePlan `
    --runtime "DOTNETCORE:8.0"

Write-Host "✅ API App Service created" -ForegroundColor Green

# Create Static Web App (also free tier)
Write-Host "🌐 Creating Static Web App..." -ForegroundColor Yellow
az staticwebapp create `
    --name $staticAppName `
    --resource-group $resourceGroup `
    --location "eastus2"

Write-Host "✅ Static Web App created" -ForegroundColor Green

# Get database credentials securely
Write-Host "🗄️ Database Configuration..." -ForegroundColor Yellow
Write-Host "Enter the password for your MySQL database on davidbaumann.pro:"
$dbPassword = Read-Host -AsSecureString
$dbPasswordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))

# Set App Service configuration
Write-Host "⚙️ Configuring App Service settings..." -ForegroundColor Yellow
$connectionString = "Server=davidbaumann.pro;Database=whoptix;Uid=whoptix_user;Pwd=$dbPasswordText;SslMode=Required;Port=3306"

az webapp config appsettings set `
    --name $apiAppName `
    --resource-group $resourceGroup `
    --settings `
    "ASPNETCORE_ENVIRONMENT=Production" `
    "ConnectionStrings__DefaultConnection=$connectionString" `
    "VITE_API_BASE_URL=https://$apiAppName.azurewebsites.net"

Write-Host "✅ App Service configured" -ForegroundColor Green

# Build and deploy backend
Write-Host "🚀 Building and deploying backend..." -ForegroundColor Yellow
Push-Location "backend\SkuVaultSaaS.Api"
try {
    dotnet publish -c Release -o "..\..\..\publish-free"
    
    # Create deployment package
    Compress-Archive -Path "..\..\..\publish-free\*" -DestinationPath "..\..\..\whoptix-deploy.zip" -Force
    
    # Deploy to Azure
    az webapp deployment source config-zip `
        --name $apiAppName `
        --resource-group $resourceGroup `
        --src "..\..\..\whoptix-deploy.zip"
    
    Write-Host "✅ Backend deployed" -ForegroundColor Green
} finally {
    Pop-Location
}

# Build frontend
Write-Host "📦 Building frontend..." -ForegroundColor Yellow
Push-Location "frontend"
try {
    # Update environment for production
    "@echo off`necho VITE_API_BASE_URL=https://$apiAppName.azurewebsites.net" | Out-File -FilePath ".env.production" -Encoding ASCII
    
    npm run build
    Write-Host "✅ Frontend built" -ForegroundColor Green
    
    # Get Static Web App deployment token
    Write-Host "🔑 Getting Static Web App deployment token..." -ForegroundColor Yellow
    $staticAppInfo = az staticwebapp secrets list --name $staticAppName --resource-group $resourceGroup | ConvertFrom-Json
    $deploymentToken = $staticAppInfo.properties.apiKey
    
    if ($deploymentToken) {
        Write-Host "✅ Got deployment token" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Manual Frontend Deployment Required:" -ForegroundColor Cyan
        Write-Host "1. Install Azure Static Web Apps CLI: npm install -g @azure/static-web-apps-cli" -ForegroundColor White
        Write-Host "2. Deploy: swa deploy ./dist --deployment-token $deploymentToken" -ForegroundColor White
    } else {
        Write-Host "⚠️ Could not get deployment token automatically" -ForegroundColor Yellow
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "🎉 Free Tier Deployment Complete!" -ForegroundColor Green
Write-Host "" 
Write-Host "📋 Resources Created (All Free Tier):" -ForegroundColor Cyan
Write-Host "• Resource Group: $resourceGroup" -ForegroundColor White
Write-Host "• App Service Plan: $appServicePlan (F1 - Free)" -ForegroundColor White  
Write-Host "• API App Service: $apiAppName" -ForegroundColor White
Write-Host "• Static Web App: $staticAppName" -ForegroundColor White
Write-Host ""
Write-Host "🔗 URLs:" -ForegroundColor Cyan
Write-Host "API: https://$apiAppName.azurewebsites.net" -ForegroundColor White
Write-Host "Frontend: Check Azure Portal for Static Web App URL" -ForegroundColor White
Write-Host ""
Write-Host "💾 Database: Using existing MySQL on davidbaumann.pro" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️ Free Tier Limitations:" -ForegroundColor Yellow
Write-Host "• App sleeps after 20 minutes of inactivity" -ForegroundColor White
Write-Host "• 1GB storage limit" -ForegroundColor White
Write-Host "• 165 minutes/day compute time" -ForegroundColor White
Write-Host "• Custom domains require paid tier" -ForegroundColor White
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test API endpoint: https://$apiAppName.azurewebsites.net/api/health" -ForegroundColor White
Write-Host "2. Deploy frontend using SWA CLI (command shown above)" -ForegroundColor White
Write-Host "3. Test full application functionality" -ForegroundColor White
Write-Host "4. Configure custom domain (upgrade to paid tier)" -ForegroundColor White