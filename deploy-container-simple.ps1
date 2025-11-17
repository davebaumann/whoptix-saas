# Simple Azure Container Instance Deployment
$azCli = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
$resourceGroup = "whoptix-rg"
$containerName = "whoptix-api-live"
$dnsName = "whoptix-api-$(Get-Random -Minimum 1000 -Maximum 9999)"

Write-Host "Deploying Whoptix via Azure Container Instances..." -ForegroundColor Green

# Get database password
Write-Host "Enter database password for davidbaumann.pro:" -ForegroundColor Yellow
$dbPassword = Read-Host -AsSecureString
$dbPasswordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))

$connectionString = "Server=davidbaumann.pro;Database=dbayd5xzdn55n8;User=u41gecrgnxvqt;Pwd=$dbPasswordText;SslMode=Required;Port=3306"

# Create container instance
Write-Host "Creating container instance..." -ForegroundColor Yellow

& $azCli container create `
    --name $containerName `
    --resource-group $resourceGroup `
    --image "mcr.microsoft.com/dotnet/samples:aspnetapp" `
    --dns-name-label $dnsName `
    --ports 80 `
    --os-type Linux `
    --cpu 1 `
    --memory 1.5 `
    --location eastus `
    --environment-variables `
        "ASPNETCORE_ENVIRONMENT=Production" `
        "ConnectionStrings__DefaultConnection=$connectionString"

Write-Host ""
Write-Host "Container Instance Created!" -ForegroundColor Green
Write-Host "URL: http://$dnsName.eastus.azurecontainer.io" -ForegroundColor Cyan
Write-Host "Cost: About $9/month if running 24/7" -ForegroundColor Yellow

# Clean up test container
Write-Host "Cleaning up test container..." -ForegroundColor Yellow
& $azCli container delete --name whoptix-container --resource-group $resourceGroup --yes