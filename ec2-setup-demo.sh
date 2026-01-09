#!/bin/bash
# EC2 Demo Database & Docker Setup Script
# Run these commands on your Ubuntu EC2 instance

set -e  # Exit on any error

echo "=========================================="
echo "Loading Docker Image..."
echo "=========================================="

# Load the Docker image from the tar file
docker load -i /tmp/justsku-api-latest.tar

# Verify the image was loaded
echo "Docker images available:"
docker images | grep justsku-api

echo ""
echo "=========================================="
echo "Docker image loaded successfully!"
echo "=========================================="
echo ""
echo "NEXT STEPS:"
echo "1. Import the demo database schema:"
echo "   mysql -h justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com -u admin -p justsku_demo < setup-demo-database.sql"
echo ""
echo "2. (When prompted for password, enter your RDS admin password)"
echo ""
echo "3. Once database is set up, run Docker container with:"
echo "   docker run -d \\"
echo "     --name justsku-api \\"
echo "     -p 5239:5239 \\"
echo "     -e ASPNETCORE_ENVIRONMENT=Production \\"
echo "     -e DB_HOST=justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com \\"
echo "     -e DB_NAME=justsku_demo \\"
echo "     -e DB_USER=admin \\"
echo "     -e DB_PASSWORD=<YOUR_RDS_PASSWORD> \\"
echo "     -e SEEDING_ENABLED=true \\"
echo "     justsku-api:latest"
echo ""
echo "4. Check logs:"
echo "   docker logs -f justsku-api"
echo ""
