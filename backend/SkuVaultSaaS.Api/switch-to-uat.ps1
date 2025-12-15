# Switch to UAT Environment
Write-Host "Switching to UAT Environment..." -ForegroundColor Green

# Copy UAT environment file
Copy-Item ".env.uat" ".env" -Force

# Set environment variable for this session
$env:ASPNETCORE_ENVIRONMENT = "UAT"

Write-Host "Environment switched to UAT" -ForegroundColor Green
Write-Host "Database: ftp.davidbaumann.pro (skuvault_uat)" -ForegroundColor Yellow
Write-Host "Frontend: Azure Static Web Apps" -ForegroundColor Yellow
Write-Host "" 
Write-Host "To run the application:" -ForegroundColor Cyan
Write-Host "dotnet run" -ForegroundColor White
Write-Host ""
Write-Host "To publish to Azure:" -ForegroundColor Cyan
Write-Host "dotnet publish -c Release -o ./publish" -ForegroundColor White