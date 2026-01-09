# AWS Deployment Setup Guide for JUSTSKU

Complete step-by-step guide to deploy JUSTSKU on AWS with App Runner, S3/CloudFront, ALB, and RDS.

**Architecture:**
```
Google Domains (justsku.com)
        ↓
AWS Route 53 (DNS)
        ↓
CloudFront + S3 (Frontend)          ALB (HTTPS/routing)
        ↓                                    ↓
React App                           App Runner (.NET API)
                                            ↓
                                    RDS MySQL (t3.micro)
```

---

## Phase 1: AWS Account Setup (Prerequisites)

### 1.1 Create AWS Account
- Visit [aws.amazon.com](https://aws.amazon.com)
- Click "Create AWS Account"
- Verify email and payment method
- **Important:** Enable MFA on root account

### 1.2 Create IAM User for Deployments
```
1. Go to IAM Console
2. Users → Create user
3. Name: justsku-deployer
4. Attach policies:
   - AmazonRDSFullAccess
   - AmazonAppRunnerFullAccess
   - AmazonS3FullAccess
   - CloudFrontFullAccess
   - ElasticLoadBalancingFullAccess
   - AWSCertificateManagerFullAccess
   - Route53FullAccess
5. Create access key for programmatic access
6. Save Access Key ID and Secret Access Key (needed for CLI)
```

### 1.3 Configure AWS CLI
```powershell
# Install AWS CLI if needed
# https://aws.amazon.com/cli/

aws configure
# Enter:
# AWS Access Key ID: [from IAM user above]
# AWS Secret Access Key: [from IAM user above]
# Default region: us-east-1
# Default output format: json
```

---

## Phase 2: Create RDS Database

### 2.1 Create RDS Instance
```
AWS Console → RDS → Databases → Create database

Configuration:
├─ Engine: MySQL 8.0
├─ Templates: Free tier (if eligible) or Dev/Test
├─ DB Instance Identifier: justsku-db
├─ Master username: admin
├─ Master password: [Generate strong password - save securely]
├─ Instance class: db.t3.micro (free tier eligible)
├─ Storage: 20 GB (free tier)
├─ Public accessibility: No (private subnet only)
└─ Security group: Create new - name it "justsku-db-sg"
```

### 2.2 Create Security Group for App Runner Access
```
EC2 → Security Groups → Create security group

Name: justsku-app-sg
Description: App Runner to RDS access
VPC: Default VPC

Inbound Rules:
├─ Type: MySQL/Aurora
├─ Protocol: TCP
├─ Port: 3306
├─ Source: justsku-db-sg (allow RDS to talk to App Runner)
└─ Save
```

### 2.3 Allow App Runner to Database
```
1. Go back to RDS instance (justsku-db)
2. Security groups → Modify
3. Add inbound rule:
   ├─ Type: MySQL/Aurora
   ├─ Port: 3306
   └─ Source: justsku-app-sg
4. Save
```

### 2.4 Get Database Endpoint
```
RDS → Databases → justsku-db
Copy: Endpoint (e.g., justsku-db.c9akciq32.us-east-1.rds.amazonaws.com)
Port: 3306
```

### 2.5 Create Database Schema
```powershell
# From your local machine, connect to RDS:
mysql -h justsku-db.c9akciq32.us-east-1.rds.amazonaws.com -u admin -p

# When prompted, enter the password you created above

# Then run your database-setup.sql:
source C:\path\to\your\database-setup.sql

# Verify:
SHOW DATABASES;
USE skuvault_prod;
SHOW TABLES;
```

---

## Phase 3: Build Docker Image for App Runner

### 3.1 Create Dockerfile
Create file: `backend/Dockerfile`

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files
COPY ["SkuVaultSaaS.Api/SkuVaultSaaS.Api.csproj", "SkuVaultSaaS.Api/"]
COPY ["SkuVaultSaas.Core/SkuVaultSaas.Core.csproj", "SkuVaultSaas.Core/"]
COPY ["SkuVaultSaaS.Infrastructure/SkuVaultSaaS.Infrastructure.csproj", "SkuVaultSaaS.Infrastructure/"]

RUN dotnet restore "SkuVaultSaaS.Api/SkuVaultSaaS.Api.csproj"

COPY . .
WORKDIR "/src/SkuVaultSaaS.Api"
RUN dotnet build "SkuVaultSaaS.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "SkuVaultSaaS.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Expose port that App Runner will use
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

ENTRYPOINT ["dotnet", "SkuVaultSaaS.Api.dll"]
```

### 3.2 Create .dockerignore
Create file: `backend/.dockerignore`

```
bin
obj
.git
.gitignore
README.md
.vs
.vscode
*.user
node_modules
dist
coverage
.env
```

### 3.3 Build and Push to ECR

```powershell
# Create ECR Repository
aws ecr create-repository --repository-name justsku-api --region us-east-1

# Get ECR login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Note: Replace 123456789012 with your AWS Account ID
# Find it: AWS Console → Account ID (top right)

# Build Docker image
cd C:\Users\dcbau\Code\SkuVaultSaaS\backend
docker build -t justsku-api:latest .

# Tag for ECR
docker tag justsku-api:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/justsku-api:latest

# Push to ECR
docker push 123456789012.dkr.ecis.us-east-1.amazonaws.com/justsku-api:latest

# Note the Image URI for next step
```

---

## Phase 4: Deploy to EC2 t2.micro (Free Tier)

### 4.1 Launch EC2 Instance
```
AWS Console → EC2 → Launch instances

Configuration:
├─ Name: justsku-api
├─ AMI: Ubuntu Server 24.04 LTS
├─ Instance type: t2.micro (free tier eligible)
├─ Key pair: Create new (justsku-api-key)
├─ Download .pem file to safe location
└─ Click "Launch instance"

Cost: FREE (first 12 months, 750 hours/month)
```

### 4.2 Configure Security Group
```
EC2 → Security Groups → Find instance security group

Inbound Rules (add these):
├─ SSH (22) from My IP
├─ HTTP (80) from 0.0.0.0/0
├─ Custom TCP (8080) from 0.0.0.0/0
└─ Save

Outbound Rules:
└─ HTTPS (443) to 0.0.0.0/0 (for ECR pull)
```

### 4.3 SSH into Instance
```powershell
# From your local machine
cd C:\path\to\your\keys
ssh -i justsku-api-key.pem ubuntu@YOUR_PUBLIC_IP
```

### 4.4 Install Docker on Instance
```bash
# On the EC2 instance
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y docker.io awscli
sudo usermod -aG docker ubuntu

# Reconnect to apply group changes
exit
```

Then SSH back in.

### 4.5 Configure ECR Access & Pull Image
```bash
# On the EC2 instance
aws configure
# Enter your AWS Access Key ID and Secret Access Key

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 324152623799.dkr.ecr.us-east-1.amazonaws.com

# Pull your image
docker pull 324152623799.dkr.ecr.us-east-1.amazonaws.com/justsku-api:latest
```

### 4.6 Run Docker Container
```bash
docker run -d \
  --name justsku-api \
  --restart always \
  -p 8080:8080 \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e DB_NAME=justsku_prod \
  -e DB_USER=admin \
  -e DB_PASSWORD=YOUR_RDS_PASSWORD \
  -e DB_HOST=justsku-db.c9akciq32.us-east-1.rds.amazonaws.com \
  -e ENCRYPTION_KEY=YOUR_32_CHAR_KEY \
  -e ENCRYPTION_IV=1234567890123456 \
  -e STRIPE_PUBLISHABLE_KEY=YOUR_STRIPE_KEY \
  -e STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET \
  -e STRIPE_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET \
  324152623799.dkr.ecr.us-east-1.amazonaws.com/justsku-api:latest
```

### 4.7 Verify Container is Running
```bash
# Check status
docker ps

# View logs
docker logs justsku-api

# Test health endpoint
curl http://localhost:8080/api/health
```

### 4.8 Get Your API URL
```
API accessible at: http://YOUR_PUBLIC_IP:8080
Example: http://54.123.45.67:8080
```

---

## Phase 5: Frontend (S3 + CloudFront)

### 5.1 Build React App
```powershell
cd C:\Users\dcbau\Code\SkuVaultSaaS\frontend
npm run build

# Creates optimized build in frontend/dist/
```

### 5.2 Create S3 Bucket
```
AWS Console → S3 → Create bucket

Bucket name: justsku-frontend-prod
Region: us-east-1
Block public access: ON (CloudFront will handle access)
```

### 5.3 Upload Frontend Build
```powershell
# Using AWS CLI
aws s3 sync ./frontend/dist s3://justsku-frontend-prod --delete --cache-control "max-age=3600"

# Verify:
aws s3 ls s3://justsku-frontend-prod
```

### 5.4 Create CloudFront Distribution
```
AWS Console → CloudFront → Create distribution

Origin Configuration:
├─ S3 bucket: justsku-frontend-prod
├─ Origin access: Legacy access identities (or use OAC)
└─ Allow methods: GET, HEAD, OPTIONS

Default cache behavior:
├─ Viewer protocol policy: Redirect HTTP to HTTPS
├─ Cache policy: Managed-CachingOptimized
├─ Compress objects: Yes
└─ Allowed HTTP methods: GET, HEAD, OPTIONS

Error pages:
├─ 404 → /index.html (for React Router)
└─ 403 → /index.html (for React Router)

Custom domain name: (leave blank for now - will add after DNS setup)
```

Get CloudFront domain (e.g., `d1234xyz.cloudfront.net`)

---

## Phase 6: Application Load Balancer (ALB)

### 6.1 Create ALB
```
AWS Console → EC2 → Load Balancers → Create Load Balancer

Type: Application Load Balancer
Name: justsku-alb
Scheme: Internet-facing
IP address type: IPv4

Network Mapping:
└─ Select all availability zones

Security groups:
├─ Create new: justsku-alb-sg
└─ Inbound:
   ├─ HTTP 80 (from anywhere)
   └─ HTTPS 443 (from anywhere)
```

### 6.2 Create Target Group for App Runner
```
Target type: IP addresses
Name: justsku-app-targets
Port: 8080
Protocol: HTTP
VPC: Default

Health check:
├─ Protocol: HTTP
├─ Path: /api/health
├─ Interval: 30 sec
├─ Timeout: 5 sec
└─ Healthy threshold: 2
```

### 6.3 Register App Runner with ALB
```
Target group → Targets → Register targets

Network:
├─ IP address: [App Runner IP - get from App Runner service details]
└─ Port: 8080

Register and wait for "Healthy" status
```

### 6.4 Add ALB Listener Rules
```
Load Balancer → Listeners → Edit rules for port 80

Rule 1:
├─ Host header: api.justsku.com
└─ Forward to: justsku-app-targets

Rule 2 (fallback):
├─ Path pattern: /api/*
└─ Forward to: justsku-app-targets
```

---

## Phase 7: DNS & SSL Certificates

### 7.1 Create SSL Certificate
```
AWS Console → Certificate Manager → Request certificate

Domain name: justsku.com
Add another name: api.justsku.com, app.justsku.com, www.justsku.com
Validation method: DNS validation
```

### 7.2 Validate Certificate (DNS)
```
Certificate Manager → Pending certificates → justsku.com
For each domain, add the CNAME record to Route 53 (shown in console)
Wait for validation (usually 5-15 minutes)
```

### 7.3 Setup Route 53 Hosted Zone
```
AWS Console → Route 53 → Hosted zones → Create hosted zone

Domain name: justsku.com
Type: Public
```

### 7.4 Update ALB to Use HTTPS
```
ALB → Listeners → Edit listener for port 443

Protocol: HTTPS
Certificate: justsku.com (from Certificate Manager)
```

### 7.5 Create Route 53 DNS Records
```
Hosted zone → Create record

Record 1:
├─ Name: justsku.com (root)
├─ Type: A (Alias)
├─ Alias target: CloudFront distribution (d1234xyz.cloudfront.net)
└─ Create

Record 2:
├─ Name: www.justsku.com
├─ Type: A (Alias)
├─ Alias target: CloudFront distribution
└─ Create

Record 3:
├─ Name: api.justsku.com
├─ Type: A (Alias)
├─ Alias target: ALB (justsku-alb-1234.us-east-1.elb.amazonaws.com)
└─ Create

Record 4:
├─ Name: app.justsku.com
├─ Type: A (Alias)
├─ Alias target: CloudFront distribution
└─ Create
```

### 7.6 Update Google Domains DNS
```
Google Domains → justsku.com → DNS settings

Custom nameservers:
Copy the 4 nameservers from Route 53 hosted zone details:
├─ ns-1234.awsdns-12.com
├─ ns-5678.awsdns-34.co.uk
├─ ns-9012.awsdns-56.org
└─ ns-3456.awsdns-78.net

Paste into Google Domains and save
Wait 24-48 hours for DNS propagation
```

### 7.7 Verify DNS Propagation
```powershell
# Check DNS resolution
nslookup justsku.com
nslookup api.justsku.com
nslookup app.justsku.com

# Should show Route 53 nameservers
```

---

## Phase 8: Update Application Configuration

### 8.1 Update appsettings.Production.json
Already configured, but verify:

```json
{
  "Cors": {
    "AllowedOrigins": [
      "https://app.justsku.com",
      "https://justsku.com",
      "https://www.justsku.com"
    ]
  },
  "ConnectionStrings": {
    "DefaultConnection": "Server=${DB_HOST};Database=${DB_NAME};User=${DB_USER};Password=${DB_PASSWORD};Port=3306;Pooling=true;SslMode=required;"
  }
}
```

### 8.2 Update Frontend API Endpoints
Create file: `frontend/.env.production`

```
VITE_API_URL=https://api.justsku.com
VITE_APP_URL=https://app.justsku.com
```

Update `frontend/src/api/client.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'https://api.justsku.com';

export const apiClient = axios.create({
  baseURL: API_URL,
  // ... rest of config
});
```

---

## Phase 9: Testing & Verification

### 9.1 Test Frontend
```
Browser:
✅ https://justsku.com
✅ https://app.justsku.com
✅ https://www.justsku.com
```

### 9.2 Test Backend API
```powershell
# Test health check
curl https://api.justsku.com/api/health

# Response should be:
# {"status":"healthy","timestamp":"2025-12-30T...","service":"JUSTSKU API"}
```

### 9.3 Test End-to-End
```
1. Open https://app.justsku.com
2. Login
3. Try connecting SkuVault credentials
4. Verify database encryption is working
5. Check CloudWatch logs for errors
```

### 9.4 Monitor Performance
```
CloudWatch → Dashboards → Create dashboard

Metrics to watch:
├─ App Runner: CPU, Memory, Active connections
├─ RDS: CPU, Database connections, Query latency
├─ CloudFront: Requests, Cache hit ratio, Errors
├─ ALB: Target health, Request count, Latency
└─ S3: PUT/GET requests
```

---

## Phase 10: CI/CD Pipeline (Optional but Recommended)

### 10.1 GitHub Actions for Auto-Deploy
Create: `.github/workflows/deploy.yml`

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_KEY }}
          aws-region: us-east-1
      
      - name: Build and push Docker image
        run: |
          docker build -t justsku-api:latest backend/
          docker tag justsku-api:latest ${{ secrets.AWS_ACCOUNT }}.dkr.ecr.us-east-1.amazonaws.com/justsku-api:latest
          aws ecr get-login-password | docker login --username AWS --password-stdin ${{ secrets.AWS_ACCOUNT }}.dkr.ecr.us-east-1.amazonaws.com
          docker push ${{ secrets.AWS_ACCOUNT }}.dkr.ecr.us-east-1.amazonaws.com/justsku-api:latest
      
      - name: Update App Runner service
        run: |
          aws apprunner update-service --service-arn ${{ secrets.APP_RUNNER_ARN }} --source-configuration ImageRepository={ImageIdentifier=${{ secrets.AWS_ACCOUNT }}.dkr.ecr.us-east-1.amazonaws.com/justsku-api:latest}
```

---

## Troubleshooting

### App Runner won't start
```
→ Check CloudWatch logs: CloudWatch → Log groups → /aws/apprunner/justsku-api
→ Verify environment variables are set correctly
→ Check database connectivity from App Runner security group
```

### Frontend shows blank page
```
→ Check browser console for CORS errors
→ Verify CloudFront origin is S3 bucket
→ Check error pages redirect to index.html
```

### Database connection fails
```
→ Verify RDS security group allows App Runner IP
→ Test: mysql -h [endpoint] -u admin -p (from EC2 bastion host)
→ Check connection string in appsettings.Production.json
```

### DNS not resolving
```
→ Wait 24-48 hours for propagation
→ Test: nslookup justsku.com @ns-1234.awsdns-12.com
→ Verify Route 53 nameservers in Google Domains
```

---

## Cost Estimates (Monthly)

**Year 1 (Free Tier):**
```
RDS t4g.micro:       $0 (12 months free)
EC2 t2.micro:        $0 (750 hours/month free)
CloudFront:          $0-10 (minimal CDN transfer)
Route 53:            $0.50 (optional DNS)
S3:                  $0-5 (minimal storage)
────────────────────────────
Total:               ~$0-5/month
```

**Year 2+ (Post-Free Tier):**
```
RDS t4g.micro:       $10-15/month
EC2 t2.micro:        $10-15/month
CloudFront:          $5-20/month (based on traffic)
Route 53:            $0.50/month (optional)
S3:                  $1-5/month
────────────────────────────
Total:               $25-50/month
```

---

## Security Checklist

- [ ] Enable MFA on AWS root account
- [ ] Use IAM user (not root) for deployments
- [ ] Store secrets in AWS Secrets Manager (not environment variables)
- [ ] Enable RDS encryption
- [ ] Enable S3 versioning and encryption
- [ ] CloudFront: Use OAI to block direct S3 access
- [ ] ALB: Only HTTPS (redirect HTTP)
- [ ] App Runner: Private endpoint (no public IP)
- [ ] Enable CloudWatch alarms for high errors
- [ ] Regular RDS backups (automated)
- [ ] Database user least privilege (not admin)

---

## Next Steps

1. **Create AWS Account** (Phase 1) ✅
2. **Set up RDS Database** (Phase 2) ✅
3. **Build Docker image & push to ECR** (Phase 3) ✅
4. **Deploy to EC2 t2.micro** (Phase 4) ← START HERE
5. **Deploy Frontend to S3/CloudFront** (Phase 5)
6. **(Optional) Create ALB** (Phase 6)
7. **(Optional) Configure DNS & SSL** (Phase 7-8)
8. **Test everything** (Phase 9)
9. **Monitor & optimize** (Phase 10)

## Cost Summary (2025)

```
Year 1 (Free Tier):
├─ RDS t4g.micro:     $0 (12 months free)
├─ EC2 t2.micro:      $0 (750 hours/month free)
├─ S3:                $0 (minimal with free tier)
├─ CloudFront:        $0 (minimal with free tier)
├─ Route 53:          $0.50/month (optional)
└─ Total:             ~$0-5/month

Year 2+:
├─ RDS t4g.micro:     $10-15/month
├─ EC2 t2.micro:      $10-15/month
├─ S3/CloudFront:     $5-20/month
└─ Total:             $25-50/month (very affordable)
```
