# Whoptix Azure Deployment Script
# Run this after your quota has been approved
# Uses existing MySQL database on davidbaumann.pro

$ErrorActionPreference = "Stop"
$resourceGroup = "whoptix-rg"
$location = "eastus"
$appServicePlan = "whoptix-plan"
$apiAppName = "whoptix-api"
$staticAppName = "whoptix-frontend"

Write-Host "🚀 Starting Whoptix Azure Deployment..." -ForegroundColor Green

# Check if logged in
$account = & "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd" account show 2>$null
if (-not $account) {
    Write-Host "Please login to Azure first: az login" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Azure CLI authenticated" -ForegroundColor Green

# Create App Service Plan using Free tier
Write-Host "📋 Creating App Service Plan (Free Tier)..." -ForegroundColor Yellow
& "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd" appservice plan create `
    --name $appServicePlan `
    --resource-group $resourceGroup `
    --sku F1 `
    --is-linux

Write-Host "✅ App Service Plan created (Free Tier)" -ForegroundColor Green

# Create API App Service
Write-Host "🔧 Creating API App Service..." -ForegroundColor Yellow
& "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd" webapp create `
    --name $apiAppName `
    --resource-group $resourceGroup `
    --plan $appServicePlan `
    --runtime "DOTNETCORE:8.0"

Write-Host "✅ API App Service created" -ForegroundColor Green

# Create Static Web App
Write-Host "🌐 Creating Static Web App..." -ForegroundColor Yellow
& "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd" staticwebapp create `
    --name $staticAppName `
    --resource-group $resourceGroup `
    --location "eastus2"

Write-Host "✅ Static Web App created" -ForegroundColor Green

# Get database credentials
Write-Host "🗄️ Database Configuration..." -ForegroundColor Yellow
$dbPassword = Read-Host -Prompt "Enter password for whoptix_user@davidbaumann.pro" -AsSecureString
$dbPasswordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))

# Set App Service configuration
Write-Host "⚙️ Configuring App Service settings..." -ForegroundColor Yellow
$connectionString = "Server=davidbaumann.pro;Database=whoptix;Uid=whoptix_user;Pwd=$dbPasswordText;SslMode=Required;Port=3306"

& "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd" webapp config appsettings set `
    --name $apiAppName `
    --resource-group $resourceGroup `
    --settings `
    "ASPNETCORE_ENVIRONMENT=Production" `
    "ConnectionStrings__DefaultConnection=$connectionString" `
    "VITE_API_BASE_URL=https://$apiAppName.azurewebsites.net"

Write-Host "✅ App Service configured" -ForegroundColor Green

# Deploy backend
Write-Host "🚀 Deploying backend..." -ForegroundColor Yellow
Set-Location "backend\SkuVaultSaaS.Api"
dotnet publish -c Release -o ..\..\..\publish

& "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd" webapp deploy `
    --name $apiAppName `
    --resource-group $resourceGroup `
    --src-path "..\..\..\publish"

Write-Host "✅ Backend deployed" -ForegroundColor Green

# Build and prepare frontend
Write-Host "📦 Building frontend..." -ForegroundColor Yellow
Set-Location "..\..\frontend"
npm run build

Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "" 
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Upload frontend build folder to Static Web App" -ForegroundColor White
Write-Host "2. Verify database connection from Azure" -ForegroundColor White  
Write-Host "3. Configure custom domains" -ForegroundColor White
Write-Host "4. Set up Stripe webhook endpoints" -ForegroundColor White
Write-Host ""
Write-Host "🔗 URLs:" -ForegroundColor Cyan
Write-Host "API: https://$apiAppName.azurewebsites.net" -ForegroundColor White
Write-Host "Frontend: Check Azure Portal for Static Web App URL" -ForegroundColor White
Write-Host ""
Write-Host "💾 Database: Using existing MySQL on davidbaumann.pro" -ForegroundColor Green