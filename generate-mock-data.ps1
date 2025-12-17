# Mock Data Generator Script for JUSTSKU
# Usage examples:
#   .\generate-mock-data.ps1 -CustomerId 1 -Environment dev
#   .\generate-mock-data.ps1 -CustomerId 1 -Products 2000 -Clear
#   .\generate-mock-data.ps1 -ListCustomers

param(
    [int]$CustomerId = 0,
    [int]$Products = 1000,
    [int]$Locations = 50,
    [int]$HistoryDays = 90,
    [switch]$Clear,
    [switch]$ListCustomers,
    [switch]$Stats,
    [string]$Environment = "dev",
    [string]$ConnectionString = ""
)

# Function to read connection string from appsettings and .env files
function Get-ConnectionString {
    param(
        [string]$Environment
    )
    
    $apiPath = Join-Path $PSScriptRoot "backend\SkuVaultSaaS.Api"
    
    # Map environment to appsettings file
    $appsettingsFile = switch ($Environment) {
        "dev" { "appsettings.Development.json" }
        "uat" { "appsettings.UAT.json" }
        "prod" { "appsettings.Production.json" }
        "demo" { "appsettings.json" }
        default { "appsettings.json" }
    }
    
    $appsettingsPath = Join-Path $apiPath $appsettingsFile
    $envPath = Join-Path $apiPath ".env.$Environment"
    
    # Check if appsettings file exists
    if (-not (Test-Path $appsettingsPath)) {
        Write-Host "Appsettings file not found: $appsettingsPath" -ForegroundColor Red
        Write-Host "Available appsettings files in ${apiPath}:" -ForegroundColor Yellow
        Get-ChildItem $apiPath -Filter "appsettings*.json" | ForEach-Object { Write-Host "  $($_.Name)" -ForegroundColor Gray }
        return $null
    }
    
    # Check if .env file exists
    if (-not (Test-Path $envPath)) {
        Write-Host "Environment file not found: $envPath" -ForegroundColor Red
        Write-Host "Available .env files in ${apiPath}:" -ForegroundColor Yellow
        Get-ChildItem $apiPath -Filter ".env*" | ForEach-Object { Write-Host "  $($_.Name)" -ForegroundColor Gray }
        return $null
    }
    
    try {
        # Read appsettings file
        $appsettings = Get-Content $appsettingsPath | ConvertFrom-Json
        $connectionTemplate = $appsettings.ConnectionStrings.DefaultConnection
        
        # Read .env file and parse key=value pairs
        $envVars = @{}
        Get-Content $envPath | ForEach-Object {
            if ($_ -match '^([^=]+)=(.*)$') {
                $envVars[$matches[1]] = $matches[2]
            }
        }
        
        # Substitute environment variables in connection string
        $connectionString = $connectionTemplate
        foreach ($key in $envVars.Keys) {
            $connectionString = $connectionString -replace "\$\{$key\}", $envVars[$key]
        }
        
        return $connectionString
    }
    catch {
        Write-Host "Error reading configuration files: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Set working directory to Tools project
$toolsPath = Join-Path $PSScriptRoot "backend\SkuVaultSaaS.Tools"
Set-Location $toolsPath

# Use provided connection string or get from appsettings
if ([string]::IsNullOrEmpty($ConnectionString)) {
    $ConnectionString = Get-ConnectionString -Environment $Environment
    
    if ([string]::IsNullOrEmpty($ConnectionString)) {
        Write-Host "Could not find connection string for environment: $Environment" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Using environment: $Environment" -ForegroundColor Cyan
Write-Host "Connection string: $ConnectionString" -ForegroundColor Yellow

try {
    if ($ListCustomers) {
        Write-Host "Listing customers..." -ForegroundColor Green
        dotnet run -- list-customers --connection-string "$ConnectionString"
    }
    elseif ($Stats -and $CustomerId -gt 0) {
        Write-Host "Getting statistics for customer $CustomerId..." -ForegroundColor Green
        dotnet run -- stats --customer-id $CustomerId --connection-string "$ConnectionString"
    }
    elseif ($CustomerId -gt 0) {
        Write-Host "Generating mock data for customer $CustomerId..." -ForegroundColor Green
        Write-Host "   Products: $Products" -ForegroundColor Gray
        Write-Host "   Locations: $Locations" -ForegroundColor Gray
        Write-Host "   History Days: $HistoryDays" -ForegroundColor Gray
        Write-Host "   Clear Existing: $Clear" -ForegroundColor Gray
        
        $args = @(
            "generate",
            "--customer-id", $CustomerId,
            "--products", $Products,
            "--locations", $Locations,
            "--history-days", $HistoryDays,
            "--connection-string", "$ConnectionString"
        )
        
        if ($Clear) {
            $args += "--clear"
        }
        
        dotnet run -- @args
    }
    else {
        Write-Host "JUSTSKU Mock Data Generator" -ForegroundColor Cyan
        Write-Host "=================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Usage Examples:" -ForegroundColor Yellow
        Write-Host "  List customers:           .\generate-mock-data.ps1 -ListCustomers" -ForegroundColor White
        Write-Host "  Generate data:            .\generate-mock-data.ps1 -CustomerId 1" -ForegroundColor White
        Write-Host "  Generate with options:    .\generate-mock-data.ps1 -CustomerId 1 -Products 2000 -Clear" -ForegroundColor White
        Write-Host "  Show statistics:          .\generate-mock-data.ps1 -CustomerId 1 -Stats" -ForegroundColor White
        Write-Host "  Use UAT environment:      .\generate-mock-data.ps1 -CustomerId 1 -Environment uat" -ForegroundColor White
        Write-Host ""
        Write-Host "Parameters:" -ForegroundColor Yellow
        Write-Host "  -CustomerId     Customer ID to generate data for" -ForegroundColor Gray
        Write-Host "  -Products       Number of products (default: 1000)" -ForegroundColor Gray
        Write-Host "  -Locations      Number of locations (default: 50)" -ForegroundColor Gray
        Write-Host "  -HistoryDays    Days of history (default: 90)" -ForegroundColor Gray
        Write-Host "  -Clear          Clear existing data first" -ForegroundColor Gray
        Write-Host "  -Environment    Environment (dev, uat, local)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    # Return to original directory
    Set-Location $PSScriptRoot
}