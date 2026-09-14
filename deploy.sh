#!/bin/bash
echo "Stopping and removing existing containers to bypass docker-compose v1.29.2 bugs..."
docker rm -f nos-backend nos-frontend nos-nginx nos-postgres nos-redis 2>/dev/null || true

echo "Pruning dangling images..."
docker image prune -f

echo "Rebuilding and starting containers..."
docker-compose -f docker-compose.prod.yml up -d --build

echo "Deployment complete!"
