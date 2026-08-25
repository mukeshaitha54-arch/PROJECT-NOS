#!/bin/bash
# NOS EC2 Deployment Script
# Run this on AWS EC2 after git pull

set -e

echo "=== NOS Deployment Starting ==="

# Check if .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Copy .env.example to .env and fill in real values first."
    exit 1
fi

# Stop and clean old containers
echo "Stopping old containers..."
docker-compose -f docker-compose.prod.yml down -v

# Remove old postgres data (fresh start)
echo "Cleaning old data..."
sudo rm -rf /var/lib/docker/volumes/nos_postgres_data/_data/* 2>/dev/null || true

# Build and start
echo "Building and starting containers..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for postgres to be ready
echo "Waiting for PostgreSQL..."
sleep 15

# Push Prisma schema (create tables)
echo "Creating database tables..."
docker-compose -f docker-compose.prod.yml run --rm backend npx prisma@6.19.3 db push --schema=./apps/backend/prisma/schema.prisma

# Restart backend to pick up fresh DB
echo "Restarting backend..."
docker-compose -f docker-compose.prod.yml restart backend

# Verify
echo "=== Verification ==="
docker ps
echo ""
echo "Health check:"
curl -s http://localhost:3001/api/v1/health || echo "Backend not ready yet (wait 30s and retry)"
echo ""
echo "=== Deployment Complete ==="
echo "Your app should be live at: http://13.127.187.47"
echo "Domain: https://project-nos.is-local.org"
