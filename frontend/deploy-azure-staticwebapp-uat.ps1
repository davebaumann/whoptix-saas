# deploy-azure-staticwebapp-uat.ps1
# Deploys the frontend to Azure Static Web Apps (Free Tier) for UAT, using the current ngrok URL and .env.uat

param(
    [string]$NgrokUrl = "https://riva-nymphean-followingly.ngrok-free.dev",
    [string]$AppName = "whoptix-frontend"
)


# Set VITE_API_BASE_URL in .env.uat
Write-Host "[1/6] Setting VITE_API_BASE_URL in .env.uat to $NgrokUrl"
$envUatPath = Join-Path $PSScriptRoot ".env.uat"
if (!(Test-Path $envUatPath)) {
    Write-Host ".env.uat not found, creating it."
    "VITE_API_BASE_URL=$NgrokUrl/" | Out-File -Encoding utf8 $envUatPath
} else {
    (Get-Content $envUatPath | Where-Object { $_ -notmatch '^VITE_API_BASE_URL=' }) | Set-Content $envUatPath
    Add-Content $envUatPath "VITE_API_BASE_URL=$NgrokUrl/"
}

# Set VITE_API_BASE_URL in .env.production for Azure build
Write-Host "[2/6] Setting VITE_API_BASE_URL in .env.production to $NgrokUrl"
$envProdPath = Join-Path $PSScriptRoot ".env.production"
if (!(Test-Path $envProdPath)) {
    Write-Host ".env.production not found, creating it."
    "VITE_API_BASE_URL=$NgrokUrl/" | Out-File -Encoding utf8 $envProdPath
} else {
    (Get-Content $envProdPath | Where-Object { $_ -notmatch '^VITE_API_BASE_URL=' }) | Set-Content $envProdPath
    Add-Content $envProdPath "VITE_API_BASE_URL=$NgrokUrl/"
}

Write-Host "[3/6] Installing dependencies"
Push-Location $PSScriptRoot
npm install

Write-Host "[4/6] Building frontend for UAT (Azure will use .env.production)"
npm run build

Write-Host "[5/6] Deploying to Azure Static Web Apps (Free Tier)"
swa deploy ./dist --env production --app-name $AppName
Pop-Location

Write-Host "[6/6] Done! Visit your Azure Static Web App URL to test."
