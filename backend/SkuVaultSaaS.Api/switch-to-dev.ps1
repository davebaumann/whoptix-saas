# Switch to Development Environment
Write-Host "Switching to Development Environment..." -ForegroundColor Green

# Copy development environment file
Copy-Item ".env.development" ".env" -Force

# Set environment variable for this session
$env:ASPNETCORE_ENVIRONMENT = "Development"

Write-Host "Environment switched to Development" -ForegroundColor Green
Write-Host "Database: localhost (skuvault_dev)" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "" 
Write-Host "To run the application:" -ForegroundColor Cyan
Write-Host "dotnet run" -ForegroundColor White