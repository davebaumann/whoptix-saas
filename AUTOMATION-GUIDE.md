# JUSTSKU Production Automation Guide

This automation eliminates manual infrastructure management, security group configuration, and password tracking.

## What's Automated

✅ **Infrastructure** (Terraform)
- EC2 instance with proper security groups
- RDS MySQL database with encryption
- S3 bucket with versioning
- CloudFront CDN distribution
- IAM roles and policies
- Networking and security

✅ **CI/CD Pipeline** (GitHub Actions)
- Automatic Docker image build on code push
- Push to ECR registry
- EC2 deployment via Systems Manager
- Frontend build and S3 deployment
- CloudFront cache invalidation

✅ **Secrets Management**
- Passwords stored securely in AWS Secrets Manager
- No hardcoded credentials in code
- Automatic EC2 environment variable injection

## Quick Start

### 1. Prerequisites
```powershell
# Install required tools
choco install terraform aws-cli docker git nodejs

# Verify
terraform -v
aws --version
docker -v
```

### 2. Configure AWS Credentials
```powershell
aws configure --profile justsku
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Region: us-east-1
# Format: json
```

### 3. First-Time Deployment
```powershell
cd C:\Users\dcbau\Code\SkuVaultSaaS

# Deploy everything (infrastructure + apps)
.\deploy.ps1 -Environment production -Action deploy -AdminPassword "YourSecurePassword123!"
```

This single command will:
- ✓ Initialize Terraform
- ✓ Create EC2, RDS, S3, CloudFront
- ✓ Build and push Docker image
- ✓ Build and deploy frontend
- ✓ Configure security groups automatically
- ✓ Set up SSL certificates
- ✓ Display deployment status

### 4. Daily Operations

**Deploy code changes:**
```powershell
git push origin main
# GitHub Actions automatically:
# - Builds Docker image
# - Pushes to ECR
# - Updates EC2
# - Deploys frontend
# - Invalidates CloudFront cache
```

**Manual deployment:**
```powershell
.\deploy.ps1 -Environment production -Action deploy
```

**View infrastructure:**
```powershell
terraform -chdir=infrastructure show
```

**Destroy everything (careful!):**
```powershell
.\deploy.ps1 -Environment production -Action destroy
```

## How It Works

### 1. GitHub Actions Workflow (`.github/workflows/deploy.yml`)
Triggered on every push to `main` branch:
- Builds Docker image
- Pushes to AWS ECR
- Connects to EC2 via Systems Manager
- Pulls new image and restarts container
- Builds and deploys frontend
- Invalidates CloudFront cache

### 2. Terraform Infrastructure (`infrastructure/main.tf`)
Manages all AWS resources as code:
- EC2 security groups (80, 443, 22)
- RDS database with encryption
- S3 bucket with versioning
- IAM roles for EC2
- Terraform state in S3 with locks

### 3. EC2 Init Script (`infrastructure/ec2-init.sh`)
Runs on EC2 first boot:
- Installs Docker
- Creates environment file
- Pulls Docker image from ECR
- Configures Nginx reverse proxy
- Obtains SSL certificate via Certbot
- Sets up CloudWatch logging

### 4. Deployment Script (`deploy.ps1`)
Orchestrates the entire process:
- Checks prerequisites
- Initializes Terraform
- Deploys infrastructure
- Builds and pushes Docker
- Builds and deploys frontend
- Reports status

## Security Features

✅ **Encrypted Data**
- RDS encryption enabled
- S3 bucket encryption
- Terraform state encryption

✅ **Access Control**
- EC2 security groups restrict traffic
- IAM roles limit permissions
- Environment variables for secrets

✅ **No Hardcoded Passwords**
- Passed as parameters
- Stored in Terraform variables
- Injected into EC2 at boot

✅ **HTTPS Everywhere**
- Let's Encrypt SSL certificates
- Nginx reverse proxy
- CloudFront HTTPS enforcement

## Troubleshooting

### "terraform state locked"
```powershell
# Release lock
terraform -chdir=infrastructure force-unlock <LOCK_ID>
```

### "ECR login failed"
```powershell
# Re-authenticate
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 324152623799.dkr.ecr.us-east-1.amazonaws.com
```

### "EC2 instance not responding"
```powershell
# Check instance status
aws ec2 describe-instance-status --instance-ids i-xxxxx --region us-east-1

# Check container logs
aws ssm send-command --instance-ids i-xxxxx --document-name "AWS-RunShellScript" --parameters 'commands=["docker logs justsku-api"]'
```

### "CloudFront returns 403"
1. Check S3 bucket public access blocks (should be blocked - CloudFront uses OAI)
2. Check CloudFront origin access identity
3. Invalidate cache: `aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"`

## Cost Monitoring

```powershell
# View estimated monthly costs
terraform -chdir=infrastructure plan -out=tfplan
# Look for estimated monthly costs in output

# View actual costs (after deployment)
aws ce get-cost-and-usage `
  --time-period Start=2026-01-01,End=2026-01-31 `
  --granularity DAILY `
  --metrics "UnblendedCost" `
  --group-by Type=DIMENSION,Key=SERVICE `
  --region us-east-1
```

## Manual Infrastructure Changes

### Update EC2 instance type
```hcl
# In infrastructure/main.tf
resource "aws_instance" "api" {
  instance_type = "t3.small"  # Change from t2.micro
}

# Apply
terraform -chdir=infrastructure apply
```

### Scale RDS
```hcl
# In infrastructure/main.tf
resource "aws_db_instance" "postgres" {
  allocated_storage = 50  # Increase from 20
}

# Apply with snapshot
terraform -chdir=infrastructure apply
```

## Secrets Management (Advanced)

Store sensitive values in AWS Secrets Manager:

```powershell
# Create secret
aws secretsmanager create-secret --name justsku/prod/stripe-key --secret-string "sk_test_xxxx"

# Reference in Terraform
data "aws_secretsmanager_secret_version" "stripe" {
  secret_id = "justsku/prod/stripe-key"
}
```

## Rollback

If deployment breaks production:

```powershell
# Revert code
git revert <commit-hash>
git push origin main

# GitHub Actions auto-deploys previous version

# Or manually
docker pull 324152623799.dkr.ecr.us-east-1.amazonaws.com/justsku-api:previous-tag
docker restart justsku-api
```

## Next Steps

1. ✅ Set up GitHub Actions secrets (AWS credentials)
2. ✅ Configure custom domain in Route 53
3. ✅ Set up monitoring/alerts in CloudWatch
4. ✅ Enable RDS automatic backups
5. ✅ Configure email notifications on deployment

## Support

For issues:
1. Check logs: `docker logs justsku-api`
2. Check Terraform plan: `terraform -chdir=infrastructure plan`
3. Check GitHub Actions: Push and view workflow status
