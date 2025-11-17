# Heroku Deployment Script for Whoptix
Write-Host "🚀 Deploying Whoptix to Heroku..." -ForegroundColor Green

# Check if Heroku CLI is installed
if (!(Get-Command heroku -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Heroku CLI not found. Installing with winget..." -ForegroundColor Red
    winget install Heroku.HerokuCLI
    Write-Host "✅ Heroku CLI installed. Please restart PowerShell and run script again." -ForegroundColor Green
    exit 0
}

# Login to Heroku (if not already logged in)
Write-Host "🔑 Checking Heroku login status..." -ForegroundColor Blue
$loginCheck = heroku auth:whoami 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Please login to Heroku:" -ForegroundColor Yellow
    heroku login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Heroku login failed" -ForegroundColor Red
        exit 1
    }
}

# Create Heroku app with auto-generated name
Write-Host "📱 Creating Heroku app..." -ForegroundColor Blue
$APP_NAME = "whoptix-api-$(Get-Random -Minimum 1000 -Maximum 9999)"

if ([string]::IsNullOrWhiteSpace($APP_NAME)) {
    heroku create
} else {
    heroku create $APP_NAME
}

# Get the app name from Heroku
$HEROKU_APP = (heroku apps:info --json | ConvertFrom-Json).name
Write-Host "✅ App created: $HEROKU_APP" -ForegroundColor Green

# Set stack to container for Docker deployment
Write-Host "🐳 Setting Heroku stack to container..." -ForegroundColor Blue
heroku stack:set container -a $HEROKU_APP

# Add MySQL database addon
Write-Host "🗄️ Adding ClearDB MySQL addon..." -ForegroundColor Blue
heroku addons:create cleardb:ignite -a $HEROKU_APP

# Get database URL and configure
Write-Host "📊 Configuring database..." -ForegroundColor Blue
$DATABASE_URL = heroku config:get CLEARDB_DATABASE_URL -a $HEROKU_APP
heroku config:set ConnectionStrings__DefaultConnection="$DATABASE_URL" -a $HEROKU_APP

# Set production environment
heroku config:set ASPNETCORE_ENVIRONMENT=Production -a $HEROKU_APP

# Initialize git repo if not exists
if (!(Test-Path ".git")) {
    Write-Host "📦 Initializing Git repository..." -ForegroundColor Blue
    git init
    git add .
    git commit -m "Initial commit"
}

# Add Heroku remote
heroku git:remote -a $HEROKU_APP

# Deploy to Heroku
Write-Host "🚀 Deploying to Heroku..." -ForegroundColor Green
git add .
git commit -m "Deploy to Heroku" --allow-empty
git push heroku main

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "🌐 Your app is available at: https://$HEROKU_APP.herokuapp.com" -ForegroundColor Cyan
Write-Host "📊 Check logs with: heroku logs --tail -a $HEROKU_APP" -ForegroundColor Yellow