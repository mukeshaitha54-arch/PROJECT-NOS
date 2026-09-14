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

# Detect or install Docker Compose v2
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then
    if command -v docker-compose >/dev/null 2>&1 && docker-compose version 2>&1 | grep -q "Docker Compose version v2"; then
        COMPOSE="docker-compose"
    else
        echo "Installing/Upgrading to Docker Compose v2..."
        sudo apt-get remove -y docker-compose 2>/dev/null || true
        sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
        mkdir -p ~/.docker/cli-plugins
        ln -sf /usr/local/bin/docker-compose ~/.docker/cli-plugins/docker-compose
        COMPOSE="docker compose"
    fi
fi

echo "Using: $($COMPOSE version)"

# Stop and clean old containers
echo "Stopping old containers..."
$COMPOSE -f docker-compose.prod.yml down -v --remove-orphans 2>/dev/null || true

# Force remove any stuck containers
STUCK=$(docker ps -a --filter "name=nos" --filter "name=backend" --filter "name=frontend" -q)
if [ -n "$STUCK" ]; then
    docker rm -f $STUCK 2>/dev/null || true
fi

# Remove old postgres data (fresh start)
echo "Cleaning old data..."
sudo rm -rf /var/lib/docker/volumes/nos_postgres_data/_data/* 2>/dev/null || true

# Build and start
echo "Building and starting containers..."
$COMPOSE -f docker-compose.prod.yml up -d --build --remove-orphans

# Wait for postgres to be ready
echo "Waiting for PostgreSQL..."
sleep 15

# Push Prisma schema (create tables)
echo "Creating database tables..."
$COMPOSE -f docker-compose.prod.yml run --rm backend npx prisma@6.19.3 db push --schema=./apps/backend/prisma/schema.prisma

# Restart backend to pick up fresh DB
echo "Restarting backend..."
$COMPOSE -f docker-compose.prod.yml restart backend

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
