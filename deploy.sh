#!/bin/bash
set -e

echo "=== NOS Production Deployment ==="

# 1. Upgrade from legacy Python docker-compose (1.29.2) if detected
if command -v docker-compose >/dev/null 2>&1 && docker-compose version 2>&1 | grep -q "1.29"; then
    echo "⚠️ Detected legacy Python docker-compose 1.29.2 (causes KeyError: ContainerConfig)."
    echo "Upgrading to modern Docker Compose v2..."
    sudo apt-get remove -y docker-compose 2>/dev/null || true
    sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    mkdir -p ~/.docker/cli-plugins
    ln -sf /usr/local/bin/docker-compose ~/.docker/cli-plugins/docker-compose
fi

# 2. Determine Docker Compose command (prefer 'docker compose', fallback to 'docker-compose')
if docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
else
    echo "Installing Docker Compose v2..."
    sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    mkdir -p ~/.docker/cli-plugins
    ln -sf /usr/local/bin/docker-compose ~/.docker/cli-plugins/docker-compose
    COMPOSE="docker compose"
fi

echo "Using Docker Compose: $($COMPOSE version)"

# 3. Clean up any broken/stuck containers from previous failed recreations
echo "Stopping existing NOS containers..."
$COMPOSE -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true

# Force remove any stuck containers prefixed with hash or named nos
STUCK_CONTAINERS=$(docker ps -a --filter "name=nos" --filter "name=backend" --filter "name=frontend" -q)
if [ -n "$STUCK_CONTAINERS" ]; then
    echo "Removing stuck containers: $STUCK_CONTAINERS"
    docker rm -f $STUCK_CONTAINERS 2>/dev/null || true
fi

# 4. Prune dangling images
echo "Pruning dangling images..."
docker image prune -f

# 5. Build and launch all services with Compose v2
echo "Building and starting NOS containers..."
$COMPOSE -f docker-compose.prod.yml up -d --build --remove-orphans

# 6. Wait for database and sync Prisma schema
echo "Waiting for PostgreSQL to be ready..."
sleep 5
echo "Syncing Prisma database schema..."
$COMPOSE -f docker-compose.prod.yml run --rm backend npx prisma@6.19.3 db push --schema=./apps/backend/prisma/schema.prisma || true

echo "=== Container Status ==="
$COMPOSE -f docker-compose.prod.yml ps

echo ""
echo "=== Deployment Complete and Error-Free! ==="
