# NOS — Production Pre-Go-Live Checklist

## Environment & Security Verification

- [x] All production secrets (`JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`) set in environment.
- [x] Production startup secret guard active (`main.ts` fails fast if secrets missing).
- [x] Multi-tier rate limiting enabled (Auth 5 req/min, Telemetry 1000 req/min, Default 100 req/min).
- [x] Global `ValidationPipe` active with `whitelist: true`, `transform: true`, `forbidNonWhitelisted: true`.
- [x] Fastify Helmet security headers and Gzip compression registered.
- [x] OpenAPI Swagger documentation accessible at `/docs`.

## Database & Persistence Verification

- [x] PostgreSQL 16 schema migrated and updated with `DeviceTimelineEvent` and extended inventory JSON fields.
- [x] All database operations encapsulated behind repository interfaces (Zero ORM Leakage).
- [x] Multi-tenant isolation verified (0% cross-tenant data leakage between organizations).

## Agent & Monitoring Pipeline Verification

- [x] Windows Agent running with `TelemetryCollectorWorker` and `InventoryCollectorWorker`.
- [x] Offline buffer service active (`%ProgramData%\NOS\Agent\telemetry_buffer.json`).
- [x] Circuit breaker active with 2-minute cooldown after 5 consecutive failures.
- [x] Agent reconnect recovery verified.

## Real-Time & UI Verification

- [x] NOC Dashboard updating continuously via Socket.IO events (Zero Polling).
- [x] Permanent Device Operational Timeline functional across all devices.
- [x] Alert Command Center supporting acknowledge, assign, escalate, and correlation.
- [x] Full UI design system deployed with dark mode, loading skeletons, badges, gauges, and error boundaries.

## Automated Testing & Benchmarking

- [x] All unit and integration test suites passing (`pnpm test`).
- [x] All 12 Operational Acceptance Testing (OAT) checkpoints passing.
- [x] Autocannon performance load benchmark passing (p99 latency < 200ms).
