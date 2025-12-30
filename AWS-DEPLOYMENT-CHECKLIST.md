# AWS Deployment Checklist

Use this checklist to track your deployment progress.

## Phase 1: AWS Account Setup
- [ ] Create AWS Account
- [ ] Enable MFA on root account
- [ ] Create IAM user (justsku-deployer)
- [ ] Attach required IAM policies
- [ ] Create access keys for IAM user
- [ ] Configure AWS CLI: `aws configure`
- [ ] Test CLI access: `aws sts get-caller-identity`

## Phase 2: RDS Database
- [ ] Create RDS MySQL instance (t3.micro)
  - Identifier: `justsku-db`
  - Master user: `admin`
  - Save password securely
- [ ] Create security group for RDS (`justsku-db-sg`)
- [ ] Record RDS endpoint: `________________`
- [ ] Create database schema: `source database-setup.sql`
- [ ] Verify tables created: `SHOW TABLES;`

## Phase 3: Docker & ECR
- [ ] Create ECR repository: `justsku-api`
- [ ] Get ECR login: `aws ecr get-login-password ...`
- [ ] Build Docker image locally:
  ```powershell
  .\scripts\build-docker.ps1 -Tag latest
  ```
- [ ] Test image: `docker run --rm justsku-api:latest dotnet --version`
- [ ] Push to ECR:
  ```powershell
  .\scripts\build-docker.ps1 -Push $true -AwsAccount 123456789012
  ```
- [ ] Verify in ECR console

## Phase 4: App Runner
- [ ] Create App Runner service
  - Name: `justsku-api`
  - Source: ECR (justsku-api:latest)
  - Port: `8080`
  - CPU: 1 vCPU
  - Memory: 2 GB
- [ ] Add environment variables:
  - `ASPNETCORE_ENVIRONMENT=Production`
  - `DB_NAME=skuvault_prod`
  - `DB_USER=admin`
  - `DB_PASSWORD=` (RDS password)
  - `DB_HOST=` (RDS endpoint)
  - `ENCRYPTION_KEY=` (32 random chars)
  - `ENCRYPTION_IV=1234567890123456`
  - `STRIPE_PUBLISHABLE_KEY=` (from Stripe dashboard)
  - `STRIPE_SECRET_KEY=` (from Stripe dashboard)
  - `STRIPE_WEBHOOK_SECRET=` (from Stripe dashboard)
- [ ] Wait for deployment to complete
- [ ] Record App Runner domain: `________________`
- [ ] Test health endpoint: `curl https://[domain]/api/health`

## Phase 5: Frontend (S3 + CloudFront)
- [ ] Create S3 bucket: `justsku-frontend-prod`
- [ ] Build frontend:
  ```powershell
  .\scripts\build-frontend.ps1
  ```
- [ ] Upload to S3:
  ```powershell
  .\scripts\build-frontend.ps1 -Deploy $true
  ```
- [ ] Create CloudFront distribution
  - Origin: S3 bucket
  - Compress: Enabled
  - Error pages: 403/404 → `/index.html`
- [ ] Record CloudFront domain: `d1234xyz.cloudfront.net`
- [ ] Record Distribution ID: `________________`

## Phase 6: Application Load Balancer
- [ ] Create security group: `justsku-alb-sg`
  - Inbound: HTTP 80, HTTPS 443
- [ ] Create ALB: `justsku-alb`
- [ ] Create target group: `justsku-app-targets` (port 8080)
- [ ] Register App Runner IP with target group
- [ ] Wait for targets to be "Healthy"
- [ ] Record ALB DNS: `________________`

## Phase 7: SSL/TLS Certificates
- [ ] Request certificate in Certificate Manager
  - Domains: `justsku.com`, `api.justsku.com`, `app.justsku.com`, `www.justsku.com`
  - Validation: DNS
- [ ] Add CNAME records to Route 53 for validation
- [ ] Wait for certificate approval (5-15 minutes)
- [ ] Update ALB listener for port 443
  - Certificate: justsku.com certificate

## Phase 8: Route 53 DNS Setup
- [ ] Create Route 53 hosted zone: `justsku.com`
- [ ] Record nameservers: 
  - `ns-____.awsdns-__.com`
  - `ns-____.awsdns-__.com`
  - `ns-____.awsdns-__.com`
  - `ns-____.awsdns-__.com`
- [ ] Update Google Domains DNS settings with Route 53 nameservers
- [ ] Create Route 53 records:
  - [ ] `justsku.com` (A record → CloudFront)
  - [ ] `www.justsku.com` (A record → CloudFront)
  - [ ] `app.justsku.com` (A record → CloudFront)
  - [ ] `api.justsku.com` (A record → ALB)
- [ ] Wait for DNS propagation (24-48 hours)
- [ ] Test DNS: `nslookup justsku.com`, `nslookup api.justsku.com`

## Phase 9: Testing
- [ ] Test Frontend
  - [ ] https://justsku.com loads
  - [ ] https://app.justsku.com loads
  - [ ] https://www.justsku.com loads
  - [ ] React app works, no CORS errors
- [ ] Test Backend
  - [ ] https://api.justsku.com/api/health returns 200
  - [ ] Database credentials work
  - [ ] SkuVault integration works
  - [ ] Stripe integration works
- [ ] Test End-to-End
  - [ ] Login works
  - [ ] Connect SkuVault credentials
  - [ ] View reports
  - [ ] Check CloudWatch logs for errors

## Phase 10: Monitoring & Security
- [ ] Create CloudWatch dashboard
- [ ] Set up CloudWatch alarms:
  - [ ] App Runner high CPU/memory
  - [ ] RDS high CPU/connections
  - [ ] CloudFront high error rate
  - [ ] ALB target unhealthy
- [ ] Enable RDS automated backups (7 days)
- [ ] Enable S3 versioning
- [ ] Enable CloudTrail logging
- [ ] Review security group rules (least privilege)
- [ ] Document environment variables location
- [ ] Set up Slack/email alerts

## Phase 11: CI/CD Setup
- [ ] Create GitHub Actions secrets:
  - [ ] `AWS_ROLE_ARN` (for OIDC)
  - [ ] `AWS_ACCOUNT_ID`
  - [ ] `SLACK_WEBHOOK` (optional)
- [ ] Enable OIDC provider in AWS IAM
- [ ] Test CI/CD pipeline with a test commit
- [ ] Verify automatic deployment to production

## Phase 12: Documentation
- [ ] Document all domain names and IPs
- [ ] Document all credentials location (AWS Secrets Manager)
- [ ] Document deployment procedure
- [ ] Document rollback procedure
- [ ] Document troubleshooting steps
- [ ] Create runbook for common issues

## Post-Deployment
- [ ] Monitor first 24 hours in CloudWatch
- [ ] Check error logs
- [ ] Verify data encryption in RDS
- [ ] Test database backup/restore
- [ ] Notify SkuVault of production domain
- [ ] Update Stripe webhook URLs
- [ ] Set up monitoring alerts
- [ ] Schedule regular backups verification

## Cost Optimization (Month 2+)
- [ ] Review CloudFront cache hit ratio
- [ ] Optimize RDS instance size if needed
- [ ] Review S3 storage usage
- [ ] Check ALB connections/traffic
- [ ] Consider Reserved Instances for RDS
- [ ] Review data transfer costs

## Troubleshooting Reference
See `AWS-DEPLOYMENT-GUIDE.md` Phase 10 for:
- App Runner won't start
- Frontend shows blank page
- Database connection fails
- DNS not resolving
- Certificate issues

---

**Deployment Started:** ________________
**Estimated Completion:** ________________
**Production Launch Date:** ________________
