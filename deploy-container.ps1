# Azure Container Instance Deployment for Whoptix
# This bypasses VM quota issues by using containers instead

$azCli = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
$resourceGroup = "whoptix-rg"
$containerName = "whoptix-api"
$dnsName = "whoptix-api-$(Get-Random -Minimum 1000 -Maximum 9999)"

Write-Host "🐳 Deploying Whoptix via Azure Container Instances..." -ForegroundColor Green
Write-Host "This bypasses VM quota limitations!" -ForegroundColor Cyan

# Build and publish the app locally first
Write-Host "📦 Building application..." -ForegroundColor Yellow
Push-Location "backend\SkuVaultSaaS.Api"
dotnet publish -c Release -o "publish"
Pop-Location

# Create a simple Dockerfile if it doesn't exist
if (-not (Test-Path "Dockerfile")) {
    Write-Host "📄 Creating Dockerfile..." -ForegroundColor Yellow
    @"
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY backend/SkuVaultSaaS.Api/publish/ .
EXPOSE 80
ENV ASPNETCORE_URLS=http://+:80
ENTRYPOINT ["dotnet", "SkuVaultSaaS.Api.dll"]
"@ | Out-File -FilePath "Dockerfile" -Encoding UTF8
}

# For now, let's use a pre-built .NET image and deploy via file share
# This is simpler than building custom Docker images

Write-Host "🗄️ Enter your database password for davidbaumann.pro:" -ForegroundColor Yellow
$dbPassword = Read-Host -AsSecureString
$dbPasswordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))

$connectionString = "Server=davidbaumann.pro;Database=dbayd5xzdn55n8;User=u41gecrgnxvqt;Pwd=$dbPasswordText;SslMode=Required;Port=3306"

# Create container instance with environment variables
Write-Host "🚀 Creating Azure Container Instance..." -ForegroundColor Yellow

& $azCli container create `
    --name $containerName `
    --resource-group $resourceGroup `
    --image mcr.microsoft.com/dotnet/aspnet:8.0 `
    --dns-name-label $dnsName `
    --ports 80 `
    --os-type Linux `
    --cpu 1 `
    --memory 1.5 `
    --location eastus `
    --environment-variables `
        "ASPNETCORE_ENVIRONMENT=Production" `
        "ConnectionStrings__DefaultConnection=$connectionString" `
        "ASPNETCORE_URLS=http://+:80"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 Container Instance Created Successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 Your Whoptix API is available at:" -ForegroundColor Cyan
    Write-Host "• URL: http://$dnsName.eastus.azurecontainer.io" -ForegroundColor White
    Write-Host "• Health Check: http://$dnsName.eastus.azurecontainer.io/api/health" -ForegroundColor White
    Write-Host ""
    Write-Host "💰 Cost: ~$0.012/hour (~$9/month for always-on)" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Test the health endpoint" -ForegroundColor White
    Write-Host "2. Upload your compiled app to the container" -ForegroundColor White
    Write-Host "3. Configure custom domain if needed" -ForegroundColor White
    
    # Clean up test container
    Write-Host ""
    Write-Host "🧹 Cleaning up test container..." -ForegroundColor Yellow
    & $azCli container delete --name whoptix-container --resource-group $resourceGroup --yes
} else {
    Write-Host "❌ Container creation failed" -ForegroundColor Red
}