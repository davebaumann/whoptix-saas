#!/bin/bash

# Heroku Deployment Script for SkuVault SaaS
echo "🚀 Deploying SkuVault SaaS to Heroku..."

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not found. Please install it from: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Login to Heroku (if not already logged in)
echo "🔑 Checking Heroku login status..."
if ! heroku auth:whoami &> /dev/null; then
    echo "Please login to Heroku:"
    heroku login
fi

# Create Heroku app (replace 'your-app-name' with your desired app name)
echo "📱 Creating Heroku app..."
read -p "Enter your app name (or press Enter for auto-generated): " APP_NAME

if [ -z "$APP_NAME" ]; then
    heroku create
else
    heroku create $APP_NAME
fi

# Get the app name from Heroku
HEROKU_APP=$(heroku apps:info --json | jq -r .name)
echo "✅ App created: $HEROKU_APP"

# Set stack to container for Docker deployment
echo "🐳 Setting Heroku stack to container..."
heroku stack:set container -a $HEROKU_APP

# Add MySQL database addon
echo "🗄️ Adding ClearDB MySQL addon..."
heroku addons:create cleardb:ignite -a $HEROKU_APP

# Get database URL
echo "📊 Configuring database..."
DATABASE_URL=$(heroku config:get CLEARDB_DATABASE_URL -a $HEROKU_APP)
heroku config:set ConnectionStrings__DefaultConnection="$DATABASE_URL" -a $HEROKU_APP

# Set production environment
heroku config:set ASPNETCORE_ENVIRONMENT=Production -a $HEROKU_APP

# Initialize git repo if not exists
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit"
fi

# Add Heroku remote
heroku git:remote -a $HEROKU_APP

# Deploy to Heroku
echo "🚀 Deploying to Heroku..."
git add .
git commit -m "Deploy to Heroku" --allow-empty
git push heroku main

echo "✅ Deployment complete!"
echo "🌐 Your app is available at: https://$HEROKU_APP.herokuapp.com"
echo "📊 Check logs with: heroku logs --tail -a $HEROKU_APP"