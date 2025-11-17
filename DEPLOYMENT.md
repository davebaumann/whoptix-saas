# 🚀 SkuVault SaaS Deployment Guide

This guide covers multiple deployment options for your SkuVault SaaS application.

## 📋 Pre-Deployment Checklist

### 1. Database Setup
- [ ] Create production MySQL database
- [ ] Update connection string in `appsettings.Production.json`
- [ ] Run database migrations: `dotnet ef database update`

### 2. Security Configuration
- [ ] Generate secure JWT key (minimum 32 characters)
- [ ] Update encryption keys in production settings
- [ ] Configure SSL/HTTPS certificates
- [ ] Set strong database passwords

### 3. Domain & DNS
- [ ] Configure domain DNS to point to your server
- [ ] Set up SSL certificate (Let's Encrypt recommended)
- [ ] Configure firewall rules (ports 80, 443, 3306)

## 🎯 Deployment Option 1: Traditional Web Hosting

### Step 1: Build for Production
```powershell
# Run the build script
.\scripts\build-production.ps1
```

### Step 2: Configure Production Settings
Edit `publish/appsettings.Production.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=your-db-server;Database=skuvault_prod;User=your-user;Password=your-password;Port=3306;"
  },
  "Jwt": {
    "Key": "your-super-secure-jwt-key-minimum-32-characters",
    "Issuer": "https://yourdomain.com",
    "Audience": "SkuVaultSaaS-Users"
  }
}
```

### Step 3: Upload to Web Server
1. Zip the entire `publish` folder
2. Upload to your web hosting server
3. Extract to your website root directory
4. Set file permissions (if Linux/Unix)

### Step 4: Configure Web Server

#### For IIS (Windows):
1. Install ASP.NET Core Runtime 8.0
2. Create new website pointing to publish folder
3. Set application pool to "No Managed Code"
4. web.config is already created by build script

#### For Nginx (Linux):
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### For Apache (Linux):
```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    Redirect permanent / https://yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    
    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/private.key
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    
    RewriteEngine on
    RewriteCond %{HTTP:UPGRADE} ^WebSocket$ [NC]
    RewriteCond %{HTTP:CONNECTION} ^Upgrade$ [NC]
    RewriteRule .* ws://localhost:5000%{REQUEST_URI} [P]
</VirtualHost>
```

### Step 5: Start Application
```bash
# Linux/Mac
cd /path/to/your/app
export ASPNETCORE_ENVIRONMENT=Production
dotnet SkuVaultSaaS.Api.dll

# Windows
cd C:\path\to\your\app
set ASPNETCORE_ENVIRONMENT=Production
dotnet SkuVaultSaaS.Api.dll
```

## 🐳 Deployment Option 2: Docker

### Step 1: Build Docker Image
```bash
# Build production files first
.\scripts\build-production.ps1

# Build Docker image
docker build -t skuvault-saas .
```

### Step 2: Run with Docker Compose
```bash
# Start the entire stack
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f skuvault-app
```

### Step 3: Configure Production Environment
1. Update `docker-compose.yml` with your settings
2. Mount your production config:
```yaml
volumes:
  - ./appsettings.Production.json:/app/appsettings.Production.json:ro
```

## ☁️ Deployment Option 3: Cloud Platforms

### Azure App Service
1. Create App Service (Linux, .NET 8)
2. Deploy via GitHub Actions or Azure CLI
3. Configure connection strings in App Settings
4. Enable Application Insights for monitoring

### AWS Elastic Beanstalk
1. Create Elastic Beanstalk application
2. Upload deployment package (publish folder as ZIP)
3. Configure environment variables
4. Set up RDS MySQL instance

### DigitalOcean App Platform
1. Connect GitHub repository
2. Configure build settings:
   - Build command: `./scripts/build-production.ps1`
   - Output directory: `publish`
3. Add environment variables

## 🔧 Production Configuration

### Environment Variables
```bash
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:80;https://+:443
ConnectionStrings__DefaultConnection="Server=...;Database=...;User=...;Password=..."
Jwt__Key="your-secure-jwt-key"
SyncSettings__Enabled=true
```

### Database Migrations
```bash
# Apply migrations to production database
dotnet ef database update --connection "your-production-connection-string"
```

### Monitoring & Logging
- Configure Application Insights or similar
- Set up log aggregation (ELK stack, Splunk, etc.)
- Monitor database performance
- Set up health checks and alerts

## 🛠️ Maintenance

### Updates & Deployments
1. Test changes in staging environment
2. Run build script: `.\scripts\build-production.ps1`
3. Deploy new version
4. Run database migrations if needed
5. Monitor application health

### Backup Strategy
- Database backups (automated daily)
- Application file backups
- Configuration file backups
- Test restore procedures regularly

### Performance Monitoring
- Database query performance
- Application response times
- Resource usage (CPU, memory, disk)
- User experience metrics

## 🔐 Security Checklist
- [ ] HTTPS enforced for all connections
- [ ] Strong JWT signing keys
- [ ] Secure database connections
- [ ] Input validation enabled
- [ ] CORS properly configured
- [ ] Secrets not in source code
- [ ] Regular security updates
- [ ] Firewall rules configured
- [ ] User access controls in place

## 🆘 Troubleshooting

### Common Issues
1. **Database connection fails**: Check connection string and firewall
2. **Static files not served**: Verify wwwroot folder and file permissions
3. **JWT authentication fails**: Check key configuration and clock sync
4. **Sync service not running**: Verify configuration and database access

### Logs Location
- Application logs: `logs/` directory
- IIS logs: `C:\inetpub\logs\LogFiles`
- Nginx logs: `/var/log/nginx/`

### Support
- Check application logs for detailed error messages
- Verify configuration files
- Test database connectivity separately
- Monitor resource usage