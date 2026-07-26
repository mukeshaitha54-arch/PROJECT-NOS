<<<<<<< HEAD
# NOS (Network Operating System)

A production-ready enterprise monorepo foundation powered by **pnpm workspaces** and **Turborepo**, designed for high-performance network management, device telemetry, and analytics.

## Monorepo Architecture

```
NOS/
├── apps/
│   ├── frontend/       # Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
│   ├── backend/        # NestJS + Fastify + Prisma ORM (High performance API & middleware)
│   └── agent/          # .NET 8 Worker Service (Monitoring agent & telemetry collector placeholder)
├── packages/
│   ├── config-eslint/     # Shared ESLint configuration
│   ├── config-typescript/ # Shared TypeScript compilation baselines
│   └── shared-types/      # Domain DTOs, interfaces, and shared telemetry enums
├── docker/             # Container configs and infrastructure scripts
└── docker-compose.yml  # Local stack orchestration (PostgreSQL, PgAdmin, Redis prepared)
```

## Production Readiness Highlights

- **Fastify & NestJS Backend**: Engineered with production-grade middleware including **Swagger (OpenAPI)**, **Helmet** security headers, **Compression**, **Pino structured JSON logging**, **Rate Limiting** (`@nestjs/throttler`), **Correlation Request ID** tracking, and a standardized **Global Exception Filter**.
- **Next.js 16 Frontend**: Structured around domain feature slices with type-safe environmental variables, modern Tailwind design tokens, and shadcn/ui components.
- **.NET Worker Agent**: Clean background telemetry collector architecture equipped with structured Dependency Injection and layered service contracts.
- **Strict DX Tooling**: Unified TypeScript validation, automated formatting via Prettier, Husky commit guards, lint-staged enforcement, and GitHub Actions CI pipelines.

## Quick Start

### 1. Prerequisites
- **Node.js**: >= v22.x
- **pnpm**: >= v9.x (`npm i -g pnpm`)
- **.NET SDK**: >= 8.0 (for monitoring agent development)
- **Docker & Docker Compose**: For database, cache, and PgAdmin provisioning

### 2. Install Dependencies
```powershell
pnpm install
```

### 3. Environment Setup
Copy environmental template files in the root and individual application workspaces:
```powershell
cp .env.example .env
cp apps/frontend/.env.example apps/frontend/.env.local
cp apps/backend/.env.example apps/backend/.env
```

### 4. Start Infrastructure (PostgreSQL, PgAdmin, Redis)
```powershell
docker compose up -d postgres pgadmin redis
```
- **PgAdmin GUI**: Accessible at http://localhost:5050 (Credentials: `admin@nos.internal` / `secure_pgadmin_password`)

### 5. Build and Develop
To execute concurrent development servers across all workspaces via Turborepo:
```powershell
pnpm run dev
```

To execute strict type checking, linting, and formatting checks:
```powershell
pnpm turbo run lint typecheck format:check
```

To build all apps and packages in optimal topological order:
```powershell
pnpm turbo run build
```
=======
# PROJECT-NOS
>>>>>>> 760af820ecfc07bbf929541558dd3fafe4f8962b
