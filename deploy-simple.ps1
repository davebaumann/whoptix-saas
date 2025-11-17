# Simple Azure Free Tier Deployment
param(
    [string]$ResourceGroup = "whoptix-free-rg",
    [string]$Location = "eastus",
    [string]$AppName = "whoptix-api-free"
)

Write-Host "🆓 Deploying Whoptix to Azure Free Tier" -ForegroundColor Green

# Check Azure CLI
try {
    $account = az account show --query "name" -o tsv 2>$null
    if ($account) {
        Write-Host "✅ Azure CLI authenticated: $account" -ForegroundColor Green
    } else {
        Write-Host "❌ Please run: az login" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Azure CLI not found or not authenticated" -ForegroundColor Red
    exit 1
}

# Create resource group
Write-Host "📋 Creating resource group..." -ForegroundColor Yellow
$rgExists = az group exists --name $ResourceGroup
if ($rgExists -eq "false") {
    az group create --name $ResourceGroup --location $Location
    Write-Host "✅ Resource group created" -ForegroundColor Green
} else {
    Write-Host "✅ Resource group exists" -ForegroundColor Green
}

# Create App Service Plan (Free Tier)
Write-Host "📋 Creating App Service Plan (F1 Free)..." -ForegroundColor Yellow
az appservice plan create `
    --name "$AppName-plan" `
    --resource-group $ResourceGroup `
    --sku F1 `
    --is-linux

Write-Host "✅ App Service Plan created" -ForegroundColor Green

# Create Web App
Write-Host "🔧 Creating Web App..." -ForegroundColor Yellow
az webapp create `
    --name $AppName `
    --resource-group $ResourceGroup `
    --plan "$AppName-plan" `
    --runtime "DOTNETCORE:8.0"

Write-Host "✅ Web App created" -ForegroundColor Green

# Get database password
$dbPassword = Read-Host "Enter database password for davidbaumann.pro" -AsSecureString
$dbPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))

# Configure app settings
Write-Host "⚙️ Configuring app settings..." -ForegroundColor Yellow
$connectionString = "Server=davidbaumann.pro;Database=whoptix;Uid=whoptix_user;Pwd=$dbPasswordPlain;SslMode=Required;Port=3306"

az webapp config appsettings set `
    --name $AppName `
    --resource-group $ResourceGroup `
    --settings `
        "ASPNETCORE_ENVIRONMENT=Production" `
        "ConnectionStrings__DefaultConnection=$connectionString"

Write-Host "✅ App settings configured" -ForegroundColor Green

# Build and deploy
Write-Host "🚀 Building application..." -ForegroundColor Yellow
Push-Location "backend\SkuVaultSaaS.Api"
dotnet publish -c Release -o "publish"

Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
Compress-Archive -Path "publish\*" -DestinationPath "deploy.zip" -Force

Write-Host "🚀 Deploying to Azure..." -ForegroundColor Yellow
az webapp deployment source config-zip `
    --name $AppName `
    --resource-group $ResourceGroup `
    --src "deploy.zip"

Pop-Location

Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "🔗 Your API is available at: https://$AppName.azurewebsites.net" -ForegroundColor Cyan
Write-Host "🔗 Health check: https://$AppName.azurewebsites.net/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Free Tier Notes:" -ForegroundColor Yellow
Write-Host "• App sleeps after 20 min of inactivity" -ForegroundColor White
Write-Host "• 60 minutes compute time per day" -ForegroundColor White
Write-Host "• 1GB storage limit" -ForegroundColor White