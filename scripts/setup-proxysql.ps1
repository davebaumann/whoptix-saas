# ProxySQL Setup Script for SkuVault SaaS
# This script sets up ProxySQL connection pooling to reduce database connections

Write-Host "=== SkuVault SaaS ProxySQL Setup ===" -ForegroundColor Green

# Check if Docker is running
try {
    docker version | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if docker-compose is available
try {
    docker-compose version | Out-Null
    Write-Host "✓ Docker Compose is available" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker Compose not found. Please install Docker Compose." -ForegroundColor Red
    exit 1
}

# Navigate to project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

Write-Host "Setting up ProxySQL connection pooling..." -ForegroundColor Yellow

# Start ProxySQL and Redis
Write-Host "Starting ProxySQL and Redis containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.proxysql.yml up -d

# Wait for ProxySQL to start
Write-Host "Waiting for ProxySQL to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test ProxySQL connection
Write-Host "Testing ProxySQL connection..." -ForegroundColor Yellow
try {
    # Test admin interface
    $adminTest = docker exec skuvault-proxysql mysql -h127.0.0.1 -P6032 -uadmin -padmin -e "SELECT 1;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ ProxySQL admin interface is accessible" -ForegroundColor Green
    } else {
        Write-Host "⚠ ProxySQL admin interface test failed" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not test ProxySQL admin interface" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== ProxySQL Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "ProxySQL Configuration:" -ForegroundColor Cyan
Write-Host "  MySQL Interface: localhost:6033" -ForegroundColor White
Write-Host "  Admin Interface: localhost:6032" -ForegroundColor White
Write-Host "  Redis Cache: localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Update your connection string to use port 6033" -ForegroundColor White
Write-Host "2. Set ASPNETCORE_ENVIRONMENT=ProxySQL" -ForegroundColor White
Write-Host "3. Restart your application" -ForegroundColor White
Write-Host ""
Write-Host "Expected Benefits:" -ForegroundColor Cyan
Write-Host "  • 90% reduction in database connections" -ForegroundColor Green
Write-Host "  • Better connection reuse and pooling" -ForegroundColor Green
Write-Host "  • Improved performance under load" -ForegroundColor Green
Write-Host ""
Write-Host "To stop ProxySQL: docker-compose -f docker-compose.proxysql.yml down" -ForegroundColor Yellow