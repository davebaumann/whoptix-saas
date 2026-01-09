# S3 + CloudFront Deployment Guide for JUSTSKU UAT Frontend

## Prerequisites
- AWS CLI installed and configured
- IAM credentials with S3 and CloudFront access
- Built frontend in `frontend/dist/`

## Deployment Steps

### 1. Create S3 Bucket
```powershell
$bucketName = "justsku-uat-frontend"
aws s3 mb s3://$bucketName --region us-east-1
```

### 2. Enable Versioning (optional but recommended)
```powershell
aws s3api put-bucket-versioning `
  --bucket $bucketName `
  --versioning-configuration Status=Enabled
```

### 3. Create and Apply Bucket Policy
Save as `bucket-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudFrontAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity/EXXXXXXXXXX"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::justsku-uat-frontend/*"
    },
    {
      "Sid": "ListBucket",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity/EXXXXXXXXXX"
      },
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::justsku-uat-frontend"
    }
  ]
}
```

Apply policy:
```powershell
aws s3api put-bucket-policy `
  --bucket $bucketName `
  --policy file://bucket-policy.json
```

### 4. Upload Frontend Build
```powershell
cd frontend
aws s3 sync dist/ s3://$bucketName/ --delete --cache-control "max-age=3600"
```

### 5. Create CloudFront Distribution (AWS Console)

**Origin Settings:**
- Origin domain: `justsku-uat-frontend.s3.amazonaws.com`
- Use CloudFront Origin Access Identity (OAI)
- Enable origin shield: No (not needed for UAT)

**Behavior:**
- Path pattern: `*`
- Compress objects: Yes
- Viewer protocol: Redirect HTTP to HTTPS
- Allowed HTTP methods: GET, HEAD
- Cache policy: Managed-CachingOptimized
- Origin request policy: None

**Error Handling:**
- 403 error → Respond with `/index.html` (status 200)
- 404 error → Respond with `/index.html` (status 200)

**Custom Headers (add in CloudFront behavior):**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.justsku.com https://uat-api.justsku.com https://api.stripe.com https://m.stripe.network https://m.stripe.com; frame-src https://js.stripe.com
```

### 6. Note CloudFront Domain
After creation, you'll get a domain like: `d1234.cloudfront.net`

### 7. Update Backend CORS (if needed)
Update `appsettings.UAT.json` CORS origins:
```json
"CORS": {
  "AllowedOrigins": [
    "https://d1234.cloudfront.net",
    "https://uat-api.justsku.com",
    "http://localhost:5173"
  ]
}
```

### 8. Point Domain (Optional)
If you have a domain (e.g., `uat.justsku.com`):
1. Go to Route 53
2. Create CNAME: `uat.justsku.com` → CloudFront domain
3. Or use CloudFront alias record

## Subsequent Deployments

After any frontend changes:
```powershell
cd frontend
npm run build
aws s3 sync dist/ s3://justsku-uat-frontend/ --delete
# Optional: Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id EXXXXXXXXXX --paths "/*"
```

## Cost Estimate
- S3 storage: ~$0.02/month (minimal)
- CloudFront: ~$0.085/GB (free tier includes 1GB/month)
- **Total for light testing: ~$0-1/month**

## Troubleshooting

**CSS/JS not loading?**
- Check CloudFront cache settings
- Invalidate cache: `aws cloudfront create-invalidation --distribution-id EXXXXXXXXXX --paths "/*"`

**Login failing (CORS)?**
- Verify CloudFront domain is in backend CORS allowed origins
- Check backend CORS config includes `https://d1234.cloudfront.net`

**404 on refresh?**
- Verify error page routing is set to `/index.html` for 403/404

## Rollback
If needed, revert to previous version:
```powershell
aws s3 sync s3://justsku-uat-frontend/ frontend/dist-old/ --only-show-errors
# Or restore from S3 versioning if enabled
```
