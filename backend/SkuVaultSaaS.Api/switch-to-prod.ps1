# Switch to Production Environment
Write-Host "Switching to Production Environment..." -ForegroundColor Red

# Copy production environment file
Copy-Item ".env.production" ".env" -Force

# Set environment variable for this session
$env:ASPNETCORE_ENVIRONMENT = "Production"

Write-Host "Environment switched to Production" -ForegroundColor Red
Write-Host "Database: ftp.davidbaumann.pro (dbayd5xzdn55n8)" -ForegroundColor Yellow
Write-Host "Frontend: Production Domain" -ForegroundColor Yellow
Write-Host "" 
Write-Host "WARNING: You are now in PRODUCTION mode!" -ForegroundColor Red
Write-Host ""
Write-Host "To publish to Azure:" -ForegroundColor Cyan
Write-Host "dotnet publish -c Release -o ./publish" -ForegroundColor White