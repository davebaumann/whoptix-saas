#!/usr/bin/env pwsh
<#
.SYNOPSIS
Runs EF Core migrations against the demo database (justsku_demo)

.DESCRIPTION
This script applies all pending Entity Framework Core migrations to the justsku_demo database,
populating it with the required schema for demonstration purposes.

.EXAMPLE
./migrate-demo-db.ps1
#>

param(
    [string]$DbHost = "justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com",
    [string]$DbName = "justsku_demo",
    [string]$DbUser = "admin",
    [string]$DbPassword = "",
    [string]$BackendPath = "C:\Users\dcbau\Code\SkuVaultSaaS\backend"
)

# Validate inputs
if ([string]::IsNullOrWhiteSpace($DbPassword)) {
    Write-Error "DbPassword is required"
    exit 1
}

# Build connection string
$connectionString = "Server=$DbHost;Database=$DbName;User=$DbUser;Password=$DbPassword;Port=3306;Pooling=true;ConnectionTimeout=30;"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database Migration - Demo Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database Host: $DbHost" -ForegroundColor Yellow
Write-Host "Database Name: $DbName" -ForegroundColor Yellow
Write-Host "Database User: $DbUser" -ForegroundColor Yellow
Write-Host ""

# Change to the backend directory
if (!(Test-Path $BackendPath)) {
    Write-Error "Backend path not found: $BackendPath"
    exit 1
}

Push-Location $BackendPath

try {
    Write-Host "Running EF Core migrations..." -ForegroundColor Cyan
    Write-Host ""
    
    # Run dotnet ef database update with the connection string
    $env:ASPNETCORE_ENVIRONMENT = "Production"
    
    # Temporarily set connection string for migration
    $env:DB_HOST = $DbHost
    $env:DB_NAME = $DbName
    $env:DB_USER = $DbUser
    $env:DB_PASSWORD = $DbPassword
    
    # Apply migrations - run from backend directory
    dotnet ef database update --project .\SkuVaultSaaS.Infrastructure --startup-project .\SkuVaultSaaS.Api --context ApplicationDbContext
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host "Demo database '$DbName' is now ready with all required tables." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Migration failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    
} finally {
    Pop-Location
}
