# NOS — Production Deployment Guide

## Overview

This guide covers building, configuring, and deploying the NOS Platform using Docker Compose in a production environment.

---

## Prerequisites

- **Docker Engine**: v24.0+
- **Docker Compose**: v2.20+
- **Node.js**: v22.0+ (for local CLI operations)
- **pnpm**: v9.0+

---

## Environment Configuration

Create a `.env` file in the repository root:

```env
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
API_PREFIX=api/v1

POSTGRES_USER=nos_admin
POSTGRES_PASSWORD=your_secure_postgres_password
POSTGRES_DB=nos_database
POSTGRES_PORT=5432

REDIS_PASSWORD=your_secure_redis_password
REDIS_PORT=6379

DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public"
REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379/0"

JWT_SECRET=your_super_secret_jwt_key_min_32_chars
REFRESH_TOKEN_SECRET=your_super_secret_refresh_token_key_min_32_chars

NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

---

## Single-Command Deployment

```bash
docker compose up --build -d
```

Verify service status:

```bash
docker ps
```

Expected containers:
- `nos_postgres` (Healthy)
- `nos_redis` (Healthy)
- `nos_backend` (Running on port 4000)
- `nos_frontend` (Running on port 3000)
- `nos_monitoring_agent` (Running as background daemon)

---

## Operational Verification Commands

```bash
# Verify backend logs
docker logs nos_backend

# Verify agent heartbeat transmission
docker logs nos_monitoring_agent

# Run database migrations inside container if needed
docker exec -it nos_backend pnpm exec prisma migrate deploy
```

---

## OpenAPI Swagger API Documentation

Access live interactive API documentation at:
`http://localhost:4000/docs`
