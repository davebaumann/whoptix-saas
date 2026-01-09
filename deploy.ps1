# JUSTSKU Complete Deployment Automation Script
# Usage: .\deploy.ps1 -Environment production -Action deploy

param(
    [ValidateSet('dev', 'staging', 'production')]
    [string]$Environment = 'production',
    
    [ValidateSet('init', 'plan', 'apply', 'destroy', 'deploy')]
    [string]$Action = 'deploy',
    
    [string]$AdminEmail = 'info@justsku.com',
    [string]$AdminPassword,
    
    [string]$AwsRegion = 'us-east-1',
    [string]$AwsProfile = 'default'
)

# Colors for output
$Colors = @{
    Success = "Green"
    Error   = "Red"
    Warning = "Yellow"
    Info    = "Cyan"
}

function Write-Log {
    param($Message, $Level = "Info")
    $color = $Colors[$Level]
    Write-Host "[$Level] $Message" -ForegroundColor $color
}

function Test-Prerequisites {
    Write-Log "Checking prerequisites..." "Info"
    
    $required = @('terraform', 'aws', 'docker', 'git')
    foreach ($tool in $required) {
        if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
            Write-Log "$tool not found. Please install it first." "Error"
            exit 1
        }
    }
    
    Write-Log "[OK] All prerequisites installed" "Success"
}

function Initialize-Terraform {
    Write-Log "Initializing Terraform..." "Info"
    
    Push-Location "infrastructure"
    
    # Create S3 bucket for state if needed
    $stateBucket = "justsku-terraform-state"
    $bucketExists = $false
    try {
        aws s3 ls "s3://$stateBucket" --region $AwsRegion -ErrorAction SilentlyContinue | Out-Null
        $bucketExists = $?
    }
    catch {
        $bucketExists = $false
    }
    
    if (-not $bucketExists) {
        Write-Log "Creating S3 state bucket..." "Info"
        aws s3 mb "s3://$stateBucket" --region $AwsRegion
        aws s3api put-bucket-versioning `
            --bucket $stateBucket `
            --versioning-configuration Status=Enabled `
            --region $AwsRegion
        aws s3api put-bucket-encryption `
            --bucket $stateBucket `
            --server-side-encryption-configuration '{
                "Rules": [{
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }]
            }' `
            --region $AwsRegion
    }
    
    terraform init -upgrade
    Pop-Location
    Write-Log "[OK] Terraform initialized" "Success"
}

function Deploy-Infrastructure {
    Write-Log "Deploying infrastructure with Terraform..." "Info"
    
    Push-Location "infrastructure"
    
    if ($Action -eq 'plan') {
        Write-Log "Running terraform plan..." "Info"
        terraform plan -out=tfplan -lock=false
    }
    elseif ($Action -eq 'apply') {
        Write-Log "Running terraform plan..." "Info"
        terraform plan -out=tfplan -lock=false
        Write-Log "Running terraform apply..." "Info"
        terraform apply -lock=false tfplan
    }
    elseif ($Action -eq 'destroy') {
        Write-Log "Destroying infrastructure..." "Warning"
        terraform destroy -auto-approve -lock=false
    }
    
    Pop-Location
    Write-Log "[OK] Infrastructure deployment complete" "Success"
}

function Build-Backend {
    Write-Log "Building backend Docker image..." "Info"
    
    Push-Location "backend"
    
    # Login to ECR
    $ecrPassword = aws ecr get-login-password --region $AwsRegion
    $ecrPassword | docker login --username AWS --password-stdin "324152623799.dkr.ecr.us-east-1.amazonaws.com"
    
    # Build and push
    $imageTag = "324152623799.dkr.ecr.us-east-1.amazonaws.com/justsku-api:$(Get-Date -Format 'yyyyMMdd-HHmm')"
    docker build -t $imageTag -t "324152623799.dkr.ecr.us-east-1.amazonaws.com/justsku-api:latest" .
    
    docker push $imageTag
    docker push "324152623799.dkr.ecr.us-east-1.amazonaws.com/justsku-api:latest"
    
    Pop-Location
    Write-Log "[OK] Backend image built and pushed" "Success"
}

function Build-Frontend {
    Write-Log "Building frontend..." "Info"
    
    Push-Location "frontend"
    
    npm ci
    npm run build
    
    # Upload to S3
    $s3Bucket = "justsku-frontend"
    aws s3 sync dist/ "s3://$s3Bucket" --delete --region $AwsRegion
    
    # Invalidate CloudFront
    $distributionId = aws cloudfront list-distributions `
        --query "DistributionList.Items[?DefaultCacheBehavior.TargetOriginId=='justsku-frontend-s3'].Id" `
        --output text
    
    if ($distributionId) {
        Write-Log "Invalidating CloudFront cache..." "Info"
        aws cloudfront create-invalidation --distribution-id $distributionId --paths "/*" --region $AwsRegion
    }
    
    Pop-Location
    Write-Log "[OK] Frontend built and deployed" "Success"
}

function Get-DeploymentStatus {
    Write-Log "Deployment Status:" "Info"
    
    # Get EC2 IP
    $ec2Ip = aws ec2 describe-instances `
        --filters "Name=tag:Name,Values=justsku-api" `
        --query 'Reservations[0].Instances[0].PublicIpAddress' `
        --output text `
        --region $AwsRegion
    
    Write-Log "API: https://$ec2Ip" "Success"
    Write-Log "Frontend: https://justsku.com" "Success"
    
    # Check service health
    Write-Log "Checking API health..." "Info"
    try {
        $health = Invoke-WebRequest -Uri "https://justsku.com/api/health" -SkipCertificateCheck
        if ($health.StatusCode -eq 200) {
            Write-Log "[OK] API is healthy" "Success"
        }
    }
    catch {
        Write-Log "API health check failed: $_" "Warning"
    }
}

function Main {
    Write-Log "JUSTSKU Deployment Script" "Info"
    Write-Log "Environment: $Environment | Action: $Action" "Info"
    
    Test-Prerequisites
    
    switch ($Action) {
        'init' {
            Initialize-Terraform
        }
        'plan' {
            Initialize-Terraform
            Deploy-Infrastructure
        }
        'apply' {
            Initialize-Terraform
            Deploy-Infrastructure
        }
        'destroy' {
            Deploy-Infrastructure
        }
        'deploy' {
            # Full deployment
            if (-not $AdminPassword) {
                $AdminPassword = Read-Host -Prompt "Enter admin password" -AsSecureString | ConvertFrom-SecureString -AsPlainText
            }
            
            Initialize-Terraform
            Deploy-Infrastructure
            Build-Backend
            Build-Frontend
            Get-DeploymentStatus
        }
    }
    
    Write-Log "Done!" "Success"
}

Main
