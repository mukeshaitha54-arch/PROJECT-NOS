# NOS — Enterprise Architecture Reference

## Overview

The Network Operations & Security (NOS) Platform is a high-availability, multi-tenant network operations center (NOC) and agent monitoring system. It continuously ingests telemetry, tracks node presence, evaluates alert rules, manages system inventories, and logs audit events for hundreds of monitored devices.

---

## Architectural Principles & Enterprise Invariants

1. **Zero ORM Leakage**: Database operations use the Repository pattern. Prisma models stay strictly inside persistence implementations (`apps/backend/src/database/repositories/`).
2. **Zero Controller Socket Emission**: Socket.IO events are emitted exclusively via service abstractions (`ISocketPublisher`), never directly in HTTP controllers.
3. **Zero Polling**: UI dashboards subscribe to real-time Socket.IO streams (`dashboard.updated`, `device.online`, `device.offline`, `telemetry.received`, `alert.triggered`).
4. **Zero Chart Policy**: UI dashboards present raw high-density tabular data, status indicators, and metric gauges without arbitrary charting abstractions.
5. **Clean Architecture**: Strict unidirectional dependency flow: Controller → Service → Repository.
6. **Multi-Tenant Isolation**: Queries and commands enforce strict `organizationId` boundaries. Platform Super Admins hold cross-tenant access; Org Admins are isolated.

---

## Technology Stack

- **Backend**: NestJS + Fastify + Prisma ORM + PostgreSQL 16 + Redis 7 + BullMQ
- **Frontend**: Next.js 16 + Tailwind CSS + Socket.IO Client + Lucide React
- **Agent**: .NET 8 C# Windows Service (`TelemetryCollectorWorker`, `InventoryCollectorWorker`, `OfflineBufferService`, `CollectorSchedulerService`)
- **Infrastructure**: Docker Compose (`nos_postgres`, `nos_redis`, `nos_backend`, `nos_frontend`, `nos_monitoring_agent`)

---

## Subsystem Architecture

```
┌────────────────────────┐      ┌─────────────────────────┐
│ .NET 8 Windows Agent   │ ────►│ NestJS Fastify Backend  │ ◄──── Socket.IO / REST ───┐
│ (Offline Buffer, WMI)  │ REST │ (Clean Arch, BullMQ)    │                           │
└────────────────────────┘      └────────────┬────────────┘               ┌─────────┴─────────┐
                                             │                            │ Next.js 16        │
                                             ▼                            │ NOC Dashboard     │
                                ┌─────────────────────────┐               └───────────────────┘
                                │ PostgreSQL 16 + Redis 7 │
                                └─────────────────────────┘
```

---

## Data Models

- **Device**: Physical or virtual node identity, status (`ONLINE`, `OFFLINE`, `DEGRADED`, `CRITICAL`, `MAINTENANCE`), last seen timestamp.
- **Heartbeat**: 30-second presence pulse containing CPU %, RAM %, Uptime, and IP address.
- **TelemetrySnapshot**: Complete 24-field metric snapshot recorded in UTC.
- **DeviceInventory**: Complete hardware/software inventory with 8 extended JSON blob fields (`eventLogs`, `windowsDefender`, `usbDevices`, `scheduledTasks`, `gpuInfo`, `smartData`, `tpmExtended`, `bitlockerInfo`).
- **DeviceTimelineEvent**: Permanent immutable lifecycle log for device status changes, heartbeats, inventory scans, and alert incidents.
- **Alert & AlertRule**: Incident management engine supporting deduplication folding, maintenance suppression, parent-child correlation, and escalation.
- **AuditLog**: Immutable compliance trail for security, config, and admin actions.
