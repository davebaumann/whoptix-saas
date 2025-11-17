@echo off
echo 🚀 Building SkuVault SaaS for Production...
echo.

REM Check if PowerShell is available
powershell -Command "Write-Host 'PowerShell is available'" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PowerShell is required but not available
    echo Please install PowerShell or run the build script directly:
    echo    .\scripts\build-production.ps1
    pause
    exit /b 1
)

REM Run the PowerShell build script
powershell -ExecutionPolicy Bypass -File ".\scripts\build-production.ps1"

if %errorlevel% neq 0 (
    echo ❌ Build failed! Check the output above for errors.
    pause
    exit /b 1
)

echo.
echo ✅ Build completed successfully!
echo 📁 Check the 'publish' folder for deployment files
echo 📖 See DEPLOYMENT.md for deployment instructions
echo.
pause