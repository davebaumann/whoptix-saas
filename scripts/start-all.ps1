# This script automates backend startup, Azure publish, and ngrok startup for SkuVaultSaaS

# Set paths
$backendApiPath = "C:\Users\dcbau\Code\SkuVaultSaaS\backend\SkuVaultSaaS.Api"
$azurePublishScript = "C:\Users\dcbau\Code\SkuVaultSaaS\deploy-azure-free.ps1"
$ngrokExe = "ngrok" # Assumes ngrok is in PATH
$ngrokPort = 5239 # Change if your backend runs on a different port

Write-Host "Starting backend API..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $backendApiPath; dotnet run" -WindowStyle Normal
Start-Sleep -Seconds 5 # Wait for backend to start

Write-Host "Publishing backend to Azure..."
& $azurePublishScript

Write-Host "Starting ngrok tunnel..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "$ngrokExe http $ngrokPort" -WindowStyle Normal

Write-Host "All services started."
