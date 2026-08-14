# NOS — Neural Operating System

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?style=flat-square&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> A personal, open-source network monitoring dashboard for developers and home lab enthusiasts.

## What is NOS?

NOS is a developer-grade monitoring dashboard I built to track devices in my home lab. A lightweight .NET agent runs on each Windows PC to collect metrics (CPU, RAM, disk, network) and sends them to a self-hosted dashboard built with Next.js and NestJS.

## Features

- **Real-Time Monitoring:** Live status updates and resource telemetry streamed via WebSocket.
- **Visual Analytics:** Interactive metric charts, temperature gauges, and storage utilization.
- **Alert System:** Configurable threshold rules for CPU load, RAM usage, and disk exhaustion.
- **Lightweight Windows Agent:** Single-file self-contained executable with offline SQLite outbox buffering.
- **Responsive Dashboard:** Modern dark-mode UI optimized for desktop, tablet, and mobile views.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS, Lucide Icons
- **Backend:** NestJS 10, Fastify, Prisma 6, PostgreSQL 16, Socket.IO, Redis
- **Agent:** .NET 8, C#, WMI / Performance Counters, SQLite
- **Deployment:** Docker, Docker Compose, Nginx

## Quick Start

```bash
# 1. Clone repository
git clone https://github.com/mukeshaitha/nos.git
cd nos

# 2. Launch platform containers
docker-compose -f docker-compose.prod.yml up -d

# 3. Seed demo review data
cd apps/backend && npx prisma db seed

# 4. Open dashboard in browser
# Navigate to: http://localhost
```

## Demo Credentials

- **Admin:** `demo@nos.local` / `Demo@123456`
- **User:** `guest@nos.local` / `Guest@123456`

## License

MIT License — free for personal, educational, and open-source use.
