# SkuVault SaaS Production Build Script
Write-Host "Building SkuVault SaaS for Production..." -ForegroundColor Green

# Set error action
$ErrorActionPreference = "Stop"

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$rootDir = Split-Path -Parent $scriptDir

Write-Host "Working directory: $rootDir" -ForegroundColor Yellow

# Step 1: Build Frontend
Write-Host "`nBuilding React Frontend..." -ForegroundColor Cyan
Set-Location "$rootDir\frontend"

# Install dependencies and build
npm install
if ($LASTEXITCODE -ne 0) { throw "Frontend npm install failed" }

npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

Write-Host "Frontend build completed!" -ForegroundColor Green

# Step 2: Build Backend
Write-Host "`nBuilding ASP.NET Core Backend..." -ForegroundColor Cyan
Set-Location "$rootDir\backend"

# Clean and build
dotnet clean
if ($LASTEXITCODE -ne 0) { throw "Backend clean failed" }

dotnet build --configuration Release
if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }

Write-Host "Backend build completed!" -ForegroundColor Green

# Step 3: Publish Backend
Write-Host "`nPublishing Backend for Production..." -ForegroundColor Cyan
$publishPath = "$rootDir\publish"

# Remove existing publish folder
if (Test-Path $publishPath) {
    Remove-Item $publishPath -Recurse -Force
}

# Publish the API project
Set-Location "$rootDir\backend\SkuVaultSaaS.Api"
dotnet publish --configuration Release --output $publishPath --self-contained false
if ($LASTEXITCODE -ne 0) { throw "Backend publish failed" }

Write-Host "Backend published to: $publishPath" -ForegroundColor Green

# Step 4: Copy Frontend to Backend wwwroot
Write-Host "`nCopying Frontend to Backend..." -ForegroundColor Cyan
$frontendDist = "$rootDir\frontend\dist"
$backendWwwroot = "$publishPath\wwwroot"

# Create wwwroot if it doesn't exist
if (-not (Test-Path $backendWwwroot)) {
    New-Item -ItemType Directory -Path $backendWwwroot | Out-Null
}

# Copy frontend files
Copy-Item "$frontendDist\*" $backendWwwroot -Recurse -Force
Write-Host "Frontend files copied to wwwroot!" -ForegroundColor Green

# Step 5: Create web.config for IIS (if deploying to IIS)
Write-Host "`nCreating web.config for IIS deployment..." -ForegroundColor Cyan
$webConfigContent = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
    </handlers>
    <aspNetCore processPath="dotnet" arguments="SkuVaultSaaS.Api.dll" stdoutLogEnabled="false" stdoutLogFile=".\logs\stdout" hostingModel="inprocess" />
  </system.webServer>
</configuration>
"@

$webConfigPath = "$publishPath\web.config"
$webConfigContent | Out-File -FilePath $webConfigPath -Encoding UTF8
Write-Host "web.config created!" -ForegroundColor Green

# Step 6: Display deployment information
Write-Host "`nBuild Complete! Deployment Information:" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Yellow
Write-Host "Published files location: $publishPath"
Write-Host "Frontend included in: $publishPath\wwwroot"
Write-Host "Main executable: SkuVaultSaaS.Api.dll"
Write-Host "Web.config created for IIS deployment"
Write-Host ""
Write-Host "Next Steps:"
Write-Host "1. Update appsettings.Production.json with your database connection"
Write-Host "2. Set environment variable: ASPNETCORE_ENVIRONMENT=Production"
Write-Host "3. Upload contents of '$publishPath' to your web hosting server"
Write-Host "4. Configure your web server to serve the application"
Write-Host ""
Write-Host "Quick local test:"
Write-Host "   cd `"$publishPath`""
Write-Host "   set ASPNETCORE_ENVIRONMENT=Production"
Write-Host "   dotnet SkuVaultSaaS.Api.dll"
Write-Host "======================================================" -ForegroundColor Yellow

# Return to original directory
Set-Location $rootDir

Write-Host "`nReady for deployment!" -ForegroundColor Green