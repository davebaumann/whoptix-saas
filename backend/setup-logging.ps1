#!/usr/bin/env pwsh
# Quick setup script for Serilog + CloudWatch logging
# Run this from the backend directory: ./setup-logging.ps1

param(
    [string]$AwsRegion = "us-east-1",
    [string]$AdminEmail = "admin@justsku.com",
    [string]$LogGroupName = "/justsku/errors"
)

Write-Host "======================================"
Write-Host "SkuVault Logging Setup Script"
Write-Host "======================================"
Write-Host ""

$BackendPath = (Get-Location)
Write-Host "Backend Path: $BackendPath"
Write-Host "AWS Region: $AwsRegion"
Write-Host "Admin Email: $AdminEmail"
Write-Host ""

# Step 1: Install NuGet packages
Write-Host "Step 1: Installing Serilog NuGet packages..."
Write-Host "========================================="

$packages = @(
    "Serilog",
    "Serilog.AspNetCore",
    "Serilog.Sinks.AwsCloudWatch",
    "Serilog.Enrichers.Environment",
    "Serilog.Enrichers.Process",
    "Serilog.Enrichers.Thread"
)

foreach ($package in $packages) {
    Write-Host "Installing: $package"
    dotnet add package $package
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install $package"
        exit 1
    }
}

Write-Host ""
Write-Host "✓ All packages installed successfully"
Write-Host ""

# Step 2: Create middleware directory if it doesn't exist
Write-Host "Step 2: Verifying middleware directory..."
Write-Host "========================================="

$middlewarePath = Join-Path $BackendPath "SkuVaultSaaS.Api\Middleware"
if (-not (Test-Path $middlewarePath)) {
    Write-Host "Creating middleware directory..."
    New-Item -ItemType Directory -Path $middlewarePath | Out-Null
}

Write-Host "✓ Middleware directory ready at: $middlewarePath"
Write-Host ""

# Step 3: AWS Setup Instructions
Write-Host "Step 3: AWS CloudWatch Setup"
Write-Host "========================================="
Write-Host ""
Write-Host "You now need to configure AWS manually:"
Write-Host ""
Write-Host "1. CREATE LOG GROUP in CloudWatch:"
Write-Host "   aws logs create-log-group --log-group-name $LogGroupName --region $AwsRegion"
Write-Host ""
Write-Host "2. CREATE SNS TOPIC:"
Write-Host "   aws sns create-topic --name skuvault-critical-errors --region $AwsRegion"
Write-Host ""
Write-Host "3. SUBSCRIBE to email notifications:"
Write-Host "   aws sns subscribe --topic-arn <TOPIC_ARN> --protocol email --notification-endpoint $AdminEmail"
Write-Host "   (Confirm subscription by clicking email link)"
Write-Host ""
Write-Host "4. CREATE METRIC FILTER (CloudWatch Console):"
Write-Host "   - Go to Log Groups > $LogGroupName"
Write-Host "   - Create Metric Filter"
Write-Host "   - Pattern: [timestamp, level = ERROR || level = CRITICAL || level = FATAL, ...]"
Write-Host "   - Metric Name: SkuVaultErrors"
Write-Host "   - Namespace: SkuVault"
Write-Host ""
Write-Host "5. CREATE ALARM (CloudWatch Console):"
Write-Host "   - Name: SkuVaultCriticalErrorAlert"
Write-Host "   - Condition: ≥ 1 error in 1 minute"
Write-Host "   - Action: Send to SNS topic"
Write-Host ""

# Step 4: IAM Permissions
Write-Host "Step 4: Required IAM Permissions"
Write-Host "========================================="
Write-Host ""
Write-Host "Your EC2/ECS task role needs these permissions:"
Write-Host ""
Write-Host @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:$($AwsRegion):*:log-group:$LogGroupName*"
    }
  ]
}
"@

Write-Host ""
Write-Host "Add these to your task role in IAM console."
Write-Host ""

# Step 5: Environment Variables
Write-Host "Step 5: Environment Variables Needed"
Write-Host "========================================="
Write-Host ""
Write-Host "Make sure these are set in your deployment:"
Write-Host ""
Write-Host "  ASPNETCORE_ENVIRONMENT=Production"
Write-Host "  AWS_REGION=$AwsRegion"
Write-Host ""

Write-Host "Setup complete! ✓"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Update Program.cs with Serilog configuration"
Write-Host "2. Register middleware in Program.cs"
Write-Host "3. Test by calling: curl https://your-api/api/[controller]/test-error"
Write-Host "4. Check CloudWatch Logs within 60 seconds"
Write-Host ""
