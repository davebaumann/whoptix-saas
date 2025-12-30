# Build and deploy frontend to S3
# Usage: .\build-frontend.ps1 -Deploy $false (for local testing)
#        .\build-frontend.ps1 -Deploy $true (to deploy to S3)

param(
    [bool]$Deploy = $false,
    [string]$BucketName = "justsku-frontend-prod",
    [string]$AwsRegion = "us-east-1",
    [string]$CloudFrontId = ""
)

$ErrorActionPreference = "Stop"

Write-Host "⚛️  Building Frontend..." -ForegroundColor Cyan

# Build React app
Push-Location frontend
try {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm ci
    
    Write-Host "Building production bundle..." -ForegroundColor Yellow
    npm run build
    
    Write-Host "✅ Frontend built successfully" -ForegroundColor Green
    
    if ($Deploy) {
        Write-Host "`n📤 Deploying to S3 ($BucketName)..." -ForegroundColor Cyan
        
        # Sync all files except index.html (immutable cache)
        Write-Host "Uploading assets..." -ForegroundColor Yellow
        aws s3 sync dist/ s3://$BucketName `
            --delete `
            --cache-control "max-age=31536000,immutable" `
            --exclude "index.html" `
            --region $AwsRegion
        
        # Upload index.html with no-cache
        Write-Host "Uploading index.html (no-cache)..." -ForegroundColor Yellow
        aws s3 cp dist/index.html s3://$BucketName/index.html `
            --content-type "text/html" `
            --cache-control "no-cache,no-store,must-revalidate" `
            --region $AwsRegion
        
        Write-Host "✅ Frontend deployed to S3" -ForegroundColor Green
        
        # Invalidate CloudFront if ID provided
        if ($CloudFrontId) {
            Write-Host "`n🔄 Invalidating CloudFront cache ($CloudFrontId)..." -ForegroundColor Yellow
            aws cloudfront create-invalidation `
                --distribution-id $CloudFrontId `
                --paths "/*" `
                --region $AwsRegion
            
            Write-Host "✅ CloudFront cache invalidated" -ForegroundColor Green
        }
    } else {
        Write-Host "`n💡 To deploy to S3, use: .\build-frontend.ps1 -Deploy `$true -BucketName justsku-frontend-prod -CloudFrontId D1234XYZ" -ForegroundColor Yellow
        Write-Host "   Built files are in: frontend/dist/" -ForegroundColor Yellow
    }
}
finally {
    Pop-Location
}

Write-Host "`n✨ Done!" -ForegroundColor Green
