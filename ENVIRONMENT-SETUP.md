# Multi-Environment Setup Guide

## Overview
This project supports three environments:
- **Development (Dev)**: Local development with localhost database
- **UAT**: Azure deployment with separate UAT database for testing
- **Production (Prod)**: Live production environment

## Quick Environment Switching

### Switch to Development
```powershell
cd backend\SkuVaultSaaS.Api
.\switch-to-dev.ps1
dotnet run
```

### Switch to UAT
```powershell
cd backend\SkuVaultSaaS.Api
.\switch-to-uat.ps1
dotnet run  # For local testing
# OR
dotnet publish -c Release -o ./publish  # For Azure deployment
```

### Switch to Production
```powershell
cd backend\SkuVaultSaaS.Api
.\switch-to-prod.ps1
dotnet publish -c Release -o ./publish
```

## Environment Configuration

### Development Environment
- **Database**: `localhost:3306/skuvault_dev`
- **Frontend**: `http://localhost:3000`
- **Features**: Database seeding enabled, fast sync intervals
- **Stripe**: Test keys
- **Email**: Development notifications

### UAT Environment
- **Database**: `ftp.davidbaumann.pro:3306/skuvault_uat`
- **Frontend**: Azure Static Web Apps (UAT)
- **Features**: No seeding, moderate sync intervals
- **Stripe**: Test keys
- **Email**: UAT notifications

### Production Environment
- **Database**: `ftp.davidbaumann.pro:3306/dbayd5xzdn55n8`
- **Frontend**: Production domain
- **Features**: No seeding, conservative sync intervals
- **Stripe**: Live keys
- **Email**: Production notifications

## Database Setup

1. **Run the database setup script**:
   ```sql
   -- Execute database-setup.sql on your MySQL server
   ```

2. **Update environment files with actual passwords**:
   - `.env.development` - Update DB_PASSWORD for dev database
   - `.env.uat` - Update DB_PASSWORD for UAT database
   - `.env.production` - Update DB_PASSWORD for production database

3. **Run migrations for each environment**:
   ```powershell
   # Switch to desired environment first
   .\switch-to-dev.ps1
   dotnet ef database update
   ```

## Azure Deployment

### Backend Deployment
1. Switch to UAT or Production environment
2. Publish the application:
   ```powershell
   dotnet publish -c Release -o ./publish
   ```
3. Deploy the `publish` folder to Azure App Service

### Frontend Deployment
1. Update frontend environment variables for the target environment
2. Build and deploy to Azure Static Web Apps

## Environment Variables

Each environment has its own `.env.*` file:
- `.env.development` - Development settings
- `.env.uat` - UAT settings  
- `.env.production` - Production settings

The active `.env` file is copied by the switch scripts.

## Testing Flow

1. **Local Development**: Use `switch-to-dev.ps1`
2. **UAT Testing**: Use `switch-to-uat.ps1` and deploy to Azure
3. **Production Release**: Use `switch-to-prod.ps1` and deploy to production

## Security Notes

- Never commit actual passwords or API keys
- Update all placeholder values in `.env.*` files
- Use different encryption keys for each environment
- Use test Stripe keys for Dev/UAT, live keys for Production

## Troubleshooting

### Database Connection Issues
- Verify database exists and user has permissions
- Check firewall settings for remote connections
- Ensure connection string format is correct

### Environment Not Switching
- Verify PowerShell execution policy allows script execution
- Check that `.env` file was copied correctly
- Restart your IDE/terminal after switching environments