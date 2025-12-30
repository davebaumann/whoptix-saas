# AWS Production Setup Guide for justsku.com

## Architecture Overview
```
justsku.com (Google Domains)
├── app.justsku.com → CloudFront → S3 (React Frontend)
└── api.justsku.com → ALB → App Runner (Backend API)
    └── RDS t3.micro (MySQL Database)
```

## Phase 1: Domain Setup (Google Domains → AWS Route 53)

### Step 1: Create Route 53 Hosted Zone
1. AWS Console → Route 53 → Hosted zones → Create hosted zone
2. Domain: `justsku.com`
3. Copy the 4 nameservers (NS records)
   - Example: `ns-1234.awsdns-56.com`

### Step 2: Update Google Domains
1. Google Domains → justsku.com → DNS settings
2. Replace nameservers with the 4 from Route 53
3. Wait for propagation (can take 24-48 hours, usually 5-30 mins)

### Step 3: Verify DNS Propagation
```powershell
nslookup justsku.com
# Should show AWS nameservers
```

---

## Phase 2: AWS Infrastructure Setup

### A. RDS MySQL Database (t3.micro)

1. **Create RDS Instance**
   - Engine: MySQL 8.0
   - Instance class: db.t3.micro
   - Multi-AZ: No (cost savings)
   - Storage: 20 GB gp3
   - DB name: `skuvault_prod`
   - Master username: `admin`
   - Master password: Generate strong password (save it!)

2. **Security Group Rules**
   - Inbound: MySQL 3306 from App Runner security group only
   - Outbound: All (default)

3. **Parameter Group**
   - Create new parameter group
   - Set: `max_connections = 100` (t3.micro limitation)

### B. App Runner Backend

1. **Create App Runner Service**
   - Source: GitHub repository (SkuVaultSaaS)
   - Build command: `cd backend/SkuVaultSaaS.Api && dotnet publish -c Release`
   - Start command: `./SkuVaultSaaS.Api`
   - Port: 5239
   - Instance size: 0.5 vCPU, 1 GB RAM (smallest)

2. **Environment Variables** (in App Runner console):
   ```
   ASPNETCORE_ENVIRONMENT=Production
   ASPNETCORE_URLS=http://+:5239
   ConnectionStrings__DefaultConnection=[RDS endpoint]
   Stripe__SecretKey=[from appsettings.Production.json]
   Stripe__PublishableKey=[from appsettings.Production.json]
   Encryption__Key=[generate 32-char key]
   Encryption__IV=1234567890123456
   SkuVaultApi__BaseUrl=https://app.skuvault.com/api
   SkuVaultApi__ClientSecret=[your secret]
   ```

3. **Security Group**
   - Inbound: HTTPS 443 from ALB security group
   - Inbound: HTTP 5239 from ALB (for health checks)
   - Outbound: All

### C. Application Load Balancer (ALB)

1. **Create ALB**
   - Name: `skuvault-api-alb`
   - Scheme: Internet-facing
   - Listeners: 443 (HTTPS), 80 (HTTP → redirect to HTTPS)
   - Target group: Point to App Runner service

2. **SSL Certificate**
   - Request cert in ACM for `api.justsku.com`
   - Validation: DNS (auto-validate via Route 53)
   - Attach to ALB listener on 443

3. **Health Check**
   - Path: `/api/health`
   - Interval: 30s
   - Healthy threshold: 2

### D. CloudFront Distribution (Frontend)

1. **Create S3 Bucket**
   - Name: `app-justsku-com-prod`
   - Block all public access: YES
   - Versioning: Enable

2. **Create CloudFront Distribution**
   - Origin: S3 bucket
   - Access: Use Origin Access Identity (OAI)
   - SSL: Require HTTPS
   - Default root object: `index.html`
   - Error responses:
     - 403, 404 → /index.html (for React routing)

3. **SSL Certificate**
   - Request cert in ACM for `app.justsku.com`
   - Validation: DNS
   - Attach to CloudFront distribution

4. **Cache Behavior**
   ```
   /api/*  → Don't cache (for API calls)
   /assets/* → Cache 1 year (fingerprinted assets)
   / → Cache 5 minutes (HTML files)
   ```

---

## Phase 3: DNS Configuration (Route 53)

Add these A records to Route 53:

```
Record          Type    Value                           Comment
--------------------------------------------------------------------
api.justsku.com A       [ALB DNS name]                  Points to API backend
app.justsku.com A       [CloudFront domain]             Points to frontend
justsku.com     A       [ALB DNS name]                  Root domain → API (optional)
```

Create CNAME aliases:
- `api.justsku.com` → ALB Alias
- `app.justsku.com` → CloudFront Alias

---

## Phase 4: CORS Configuration

Once domains are set up, use these CORS settings:

### appsettings.Development.json (local development)
```json
{
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:3000"
    ]
  }
}
```

### appsettings.Production.json (AWS)
```json
{
  "Cors": {
    "AllowedOrigins": [
      "https://app.justsku.com",
      "https://justsku.com"
    ]
  }
}
```

### Update Program.cs
```csharp
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
    ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendDev", policy =>
    {
        policy
            .WithOrigins(corsOrigins)
            .AllowCredentials()
            .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .WithHeaders("Content-Type", "Authorization", "Accept");
    });
});
```

---

## Phase 5: Deployment Checklist

- [ ] Route 53 hosted zone created
- [ ] Google Domains nameservers updated
- [ ] DNS propagation verified
- [ ] RDS MySQL instance running
- [ ] App Runner service deployed
- [ ] ALB configured with SSL
- [ ] CloudFront distribution active
- [ ] ACM certificates issued and verified
- [ ] Route 53 A records configured
- [ ] CORS origins updated in code
- [ ] Environment variables set in App Runner
- [ ] Database migrations run
- [ ] Frontend built and uploaded to S3
- [ ] Test: Visit https://app.justsku.com
- [ ] Test: API calls work from frontend

---

## Cost Estimate (Monthly)

| Service | Size | Cost |
|---------|------|------|
| RDS MySQL | t3.micro | ~$15 |
| App Runner | 0.5 vCPU, 1GB | ~$35 |
| ALB | | ~$16 |
| CloudFront | 100GB/mo | ~$10 |
| Route 53 | Hosted zone | $0.50 |
| Data transfer | | ~$5 |
| **TOTAL** | | **~$80/month** |

---

## Next Steps

1. Start with Phase 1 (Route 53 + DNS)
2. While DNS propagates, set up Phase 2 (RDS, App Runner, ALB, CloudFront)
3. Once DNS active, configure Phase 3 (Route 53 records)
4. Update CORS in Phase 4
5. Deploy and test in Phase 5
