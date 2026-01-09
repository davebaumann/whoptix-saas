#!/bin/bash
set -e

# JUSTSKU EC2 Initialization Script
# This script runs when the EC2 instance starts

# Update system
apt-get update
apt-get install -y docker.io docker-compose curl wget git

# Start Docker
systemctl start docker
systemctl enable docker

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Create environment file for Docker
cat > /home/ubuntu/.env.production <<EOF
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080
ASPNETCORE_HTTPS_PORT=8443

# Database
DB_HOST=${DB_HOST}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# Seeding
SeedAdmin:Email=${ADMIN_EMAIL}
SeedAdmin:Password=${ADMIN_PASSWORD}

# Encryption keys (should be from Secrets Manager in production)
ENCRYPTION_KEY=B7k\$2xN9@pL4mR8\$vQ3tY6w1jS5hA0eD
ENCRYPTION_IV=X8k@2pN5\$wL3mQ7r

# Stripe (update with real keys)
Stripe__SecretKey=sk_test_xxxxxx
Stripe__PublishableKey=pk_test_xxxxxx
Stripe__PriceIds__standard_monthly=price_xxxxxx
Stripe__PriceIds__professional_monthly=price_xxxxxx
Stripe__PriceIds__enterprise_monthly=price_xxxxxx

# CORS
CORS_ALLOWED_ORIGINS=https://app.justsku.com;https://justsku.com;https://www.justsku.com
ALLOWED_HOSTS=justsku.com;*.justsku.com;api.justsku.com

# Email (update with real settings)
Email__Provider=SendGrid
Email__ApiKey=your_sendgrid_key
Email__FromEmail=noreply@justsku.com
Email__FromName=JUSTSKU
EOF

# Set proper permissions
chown ubuntu:ubuntu /home/ubuntu/.env.production
chmod 600 /home/ubuntu/.env.production

# Configure CloudWatch Logs (optional)
# aws configure set region us-east-1

# Pull and run Docker image
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${ECR_REGISTRY}

docker pull ${ECR_REGISTRY}/${IMAGE_NAME}:latest

docker run -d \
  --name justsku-api \
  -p 127.0.0.1:8080:8080 \
  --env-file /home/ubuntu/.env.production \
  --restart always \
  --log-driver awslogs \
  --log-opt awslogs-group=/justsku/api \
  --log-opt awslogs-region=us-east-1 \
  ${ECR_REGISTRY}/${IMAGE_NAME}:latest

# Setup Nginx reverse proxy
apt-get install -y nginx certbot python3-certbot-nginx

cat > /etc/nginx/sites-available/justsku <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name justsku.com api.justsku.com www.justsku.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/justsku /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl restart nginx

# Get SSL certificate (certbot)
certbot --nginx -d justsku.com -d api.justsku.com -d www.justsku.com --non-interactive --agree-tos -m admin@justsku.com || true

# Setup CloudWatch agent for monitoring
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i -E ./amazon-cloudwatch-agent.deb

echo "✓ EC2 initialization complete"
echo "✓ Docker container running at http://127.0.0.1:8080"
echo "✓ Nginx reverse proxy configured"
echo "✓ SSL certificate requested (check certbot status)"
