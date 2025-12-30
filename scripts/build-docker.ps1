# Build Docker image locally for testing
# Usage: .\build-docker.ps1 -Tag "latest" -Push $false

param(
    [string]$Tag = "latest",
    [bool]$Push = $false,
    [string]$AwsAccount = "",
    [string]$AwsRegion = "us-east-1"
)

$ErrorActionPreference = "Stop"

Write-Host "🐳 Building JUSTSKU Docker Image..." -ForegroundColor Cyan

# Build image
$imageName = "justsku-api:$Tag"
Write-Host "Building: $imageName" -ForegroundColor Green

docker build -t $imageName `
             -f backend/Dockerfile `
             backend/..

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker image built: $imageName" -ForegroundColor Green

# Test image
Write-Host "`n🧪 Testing Docker image..." -ForegroundColor Cyan
docker run --rm $imageName dotnet --version

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker test failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker image test passed" -ForegroundColor Green

# Optionally push to ECR
if ($Push -and $AwsAccount) {
    Write-Host "`n📤 Pushing to ECR..." -ForegroundColor Cyan
    
    $ecrRegistry = "$AwsAccount.dkr.ecr.$AwsRegion.amazonaws.com"
    $ecrRepo = "justsku-api"
    
    # Login to ECR
    Write-Host "Logging in to ECR..." -ForegroundColor Yellow
    aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin $ecrRegistry
    
    # Tag for ECR
    $ecrImage = "$ecrRegistry/$ecrRepo`:$Tag"
    Write-Host "Tagging image as: $ecrImage" -ForegroundColor Yellow
    docker tag $imageName $ecrImage
    
    # Push to ECR
    Write-Host "Pushing to ECR..." -ForegroundColor Yellow
    docker push $ecrImage
    
    Write-Host "✅ Image pushed to ECR: $ecrImage" -ForegroundColor Green
} else {
    Write-Host "`n💡 To push to ECR, use: .\build-docker.ps1 -Push `$true -AwsAccount 123456789012" -ForegroundColor Yellow
}

Write-Host "`n✨ Done!" -ForegroundColor Green
