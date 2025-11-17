# Working Azure Free Tier Deployment Script
# Uses correct Azure CLI path and free tier resources

$ErrorActionPreference = "Stop"
$azCli = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
$resourceGroup = "whoptix-rg"  # Use existing resource group
$location = "eastus"
$appServicePlan = "whoptix-free-plan"
$apiAppName = "whoptix-api-$(Get-Random -Minimum 1000 -Maximum 9999)"  # Add random suffix for uniqueness

Write-Host "🆓 Deploying Whoptix to Azure Free Tier" -ForegroundColor Green
Write-Host "📧 Account: dcbaumann@hotmail.com" -ForegroundColor Cyan
Write-Host ""

# Verify Azure login
try {
    $account = & $azCli account show --query "user.name" -o tsv
    Write-Host "✅ Logged in as: $account" -ForegroundColor Green
} catch {
    Write-Host "❌ Please run: az login" -ForegroundColor Red
    exit 1
}

# Create App Service Plan (Free F1)
Write-Host "📋 Creating Free App Service Plan..." -ForegroundColor Yellow
try {
    & $azCli appservice plan create `
        --name $appServicePlan `
        --resource-group $resourceGroup `
        --sku F1 `
        --is-linux
    Write-Host "✅ App Service Plan created (F1 - Free)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ App Service Plan may already exist or quota issue" -ForegroundColor Yellow
}

# Create Web App
Write-Host "🔧 Creating Web App: $apiAppName..." -ForegroundColor Yellow
try {
    & $azCli webapp create `
        --name $apiAppName `
        --resource-group $resourceGroup `
        --plan $appServicePlan `
        --runtime "DOTNETCORE:8.0"
    Write-Host "✅ Web App created" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create Web App. Check quota limits." -ForegroundColor Red
    Write-Host "You may need to:" -ForegroundColor Yellow
    Write-Host "1. Request quota increase in Azure Portal" -ForegroundColor White
    Write-Host "2. Try a different app name" -ForegroundColor White
    Write-Host "3. Use a different region" -ForegroundColor White
    exit 1
}

# Configure connection string
Write-Host "🗄️ Database Configuration..." -ForegroundColor Yellow
Write-Host "Enter your MySQL password for davidbaumann.pro:"
$dbPassword = Read-Host -AsSecureString
$dbPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))

$connectionString = "Server=davidbaumann.pro;Database=whoptix;Uid=whoptix_user;Pwd=$dbPasswordPlain;SslMode=Required;Port=3306"

# Set app configuration
Write-Host "⚙️ Configuring app settings..." -ForegroundColor Yellow
& $azCli webapp config appsettings set `
    --name $apiAppName `
    --resource-group $resourceGroup `
    --settings `
        "ASPNETCORE_ENVIRONMENT=Production" `
        "ConnectionStrings__DefaultConnection=$connectionString"

Write-Host "✅ App settings configured" -ForegroundColor Green

# Build and deploy
Write-Host "🚀 Building and deploying application..." -ForegroundColor Yellow
Push-Location "backend\SkuVaultSaaS.Api"
try {
    # Clean build
    dotnet clean
    dotnet publish -c Release -o "publish"
    
    # Create deployment package
    if (Test-Path "deploy.zip") { Remove-Item "deploy.zip" }
    Compress-Archive -Path "publish\*" -DestinationPath "deploy.zip" -Force
    
    # Deploy to Azure
    Write-Host "📤 Uploading to Azure..." -ForegroundColor Yellow
    & $azCli webapp deployment source config-zip `
        --name $apiAppName `
        --resource-group $resourceGroup `
        --src "deploy.zip"
    
    Write-Host "✅ Application deployed successfully!" -ForegroundColor Green
} finally {
    Pop-Location
}

# Test the deployment
Write-Host "🔍 Testing deployment..." -ForegroundColor Yellow
$apiUrl = "https://$apiAppName.azurewebsites.net"
$healthUrl = "$apiUrl/api/health"

Start-Sleep -Seconds 30  # Give the app time to start

try {
    $response = Invoke-WebRequest -Uri $healthUrl -TimeoutSec 60
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Health check passed!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Health check failed (app may still be starting)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Your Whoptix API Resources:" -ForegroundColor Cyan
Write-Host "• Resource Group: $resourceGroup" -ForegroundColor White
Write-Host "• App Service Plan: $appServicePlan (F1 - Free)" -ForegroundColor White
Write-Host "• Web App: $apiAppName" -ForegroundColor White
Write-Host ""
Write-Host "🔗 URLs:" -ForegroundColor Cyan
Write-Host "• API Base: $apiUrl" -ForegroundColor White
Write-Host "• Health Check: $healthUrl" -ForegroundColor White
Write-Host "• Swagger: $apiUrl/swagger" -ForegroundColor White
Write-Host ""
Write-Host "💾 Database: External MySQL on davidbaumann.pro" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️ Free Tier Limitations:" -ForegroundColor Yellow
Write-Host "• App sleeps after 20 minutes of inactivity" -ForegroundColor White
Write-Host "• 60 minutes compute time per day" -ForegroundColor White
Write-Host "• 1GB storage and bandwidth limits" -ForegroundColor White
Write-Host "• No custom domain support" -ForegroundColor White
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test the API endpoints" -ForegroundColor White
Write-Host "2. Set up your frontend to use: $apiUrl" -ForegroundColor White
Write-Host "3. Configure Stripe webhook to: $apiUrl/api/stripe/webhook" -ForegroundColor White
Write-Host "4. Monitor usage in Azure Portal" -ForegroundColor White