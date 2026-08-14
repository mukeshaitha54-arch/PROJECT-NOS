# NOS Repository Architecture & Boundary Map v1.0

This specification maps the entire physical directory structure of the Neural Operating System (NOS) monorepo, governing folder purpose, structural ownership, allowed usage, and strictly forbidden interactions in accordance with **Global Rule 2** ("Every folder must have exactly one responsibility") and **Global Rule 3** ("No circular dependencies").

---

## 1. Complete Monorepo Structural Tree & Responsibility Map

```
NOS/ (Monorepo Root)
├── apps/
│   ├── agent/                 [Endpoint Monitoring Worker]
│   ├── backend/               [Enterprise SaaS & Ingestion Core]
│   └── frontend/              [Operator UI & Presentation Layer]
├── packages/
│   ├── config-eslint/         [Shared Code Quality Standard]
│   ├── config-typescript/     [Shared Compilation Standard]
│   └── shared-types/          [Unified API & Domain DTO Contracts]
├── docs/                      [System Documentation & Architecture Specifications]
├── docker-compose.yml         [Production Stack Topology]
├── docker-compose.dev.yml     [Local Developer Ergonomics Stack]
├── turbo.json                 [Monorepo Pipeline & Caching Engine]
└── pnpm-workspace.yaml        [Package Resolution & Linkage Engine]
```

---

## 2. Directory Matrix: Purpose, Ownership, Permissions, & Restrictions

### Root Applications (`apps/*`)

| Folder Path          | Purpose & Single Responsibility                                                                                           | Owning Domain                         | Who is Allowed to Use It                                                               | Who Cannot Use It (Forbidden)                                                                                           |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------ | :------------------------------------ | :------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| **`apps/agent/`**    | C# .NET daemon responsible for system diagnostic collection and secure HTTP ingestion payload submission.                 | Monitoring Infrastructure Engineering | Monitored target operating systems (Windows/Linux); CI test simulation execution.      | Frontend Application; Backend Application (backend never pushes commands directly to unauthenticated agent filesystem). |
| **`apps/backend/`**  | NestJS enterprise API gateway, multi-tenant authentication engine, telemetry processing pipeline, and domain services.    | Backend Core Engineering              | Web web applications via REST/WebSocket; Endpoint agents via verified HTTPS ingestion. | Database direct consumers (all storage queries MUST terminate in backend service layer).                                |
| **`apps/frontend/`** | Next.js App Router presentation UI providing interactive fleet telemetry, rule simulation, and administrative dashboards. | Frontend Presentation Engineering     | Human system operators, tenant managers, and enterprise auditors via web browsers.     | Backend domain logic; Monitoring Agents (no agent communication terminates at frontend).                                |

---

### Shared Monorepo Packages (`packages/*`)

| Folder Path                       | Purpose & Single Responsibility                                                                                          | Owning Domain                 | Who is Allowed to Use It                                            | Who Cannot Use It (Forbidden)                                                                     |
| :-------------------------------- | :----------------------------------------------------------------------------------------------------------------------- | :---------------------------- | :------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------ |
| **`packages/shared-types/`**      | Immovable contract repository containing pure TypeScript interfaces, enums, and DTO structures shared across boundaries. | Full-Stack Architecture Board | `apps/backend`, `apps/frontend`, automation verification harnesses. | External unauthenticated third-party code; non-TypeScript runtimes without transpile translation. |
| **`packages/config-eslint/`**     | Centralized static syntax and linting rules enforcing absolute consistency and zero placeholder code patterns.           | DevOps & Quality Assurance    | Entire workspace (`apps/*`, `packages/*`).                          | None (universal adherence required).                                                              |
| **`packages/config-typescript/`** | Universal `tsconfig` inheritance trees guaranteeing strict type checking, non-nullable types, and compilation stability. | Core Platform Engineering     | All TypeScript-based apps and packages in the workspace.            | Non-TypeScript projects (`apps/agent`).                                                           |

---

### Internal Architecture of `apps/backend/`

```
apps/backend/src/
├── common/             [Global Cross-Cutting Guards, Filters, Interceptors, & Interfaces]
├── config/             [Typed Environment Configuration Loader]
├── modules/
│   ├── alerts/         [Alert Notification & Rule Simulation Domain]
│   ├── auth/           [Authentication, JWT Lifecycle, & Session Security]
│   ├── dashboard/      [Aggregated Fleet Dashboard KPI Telemetry Domain]
│   ├── device/         [Device Registration & Heartbeat State Domain]
│   ├── fleet/          [Registration Key & Bulk Fleet Orchestration Domain]
│   ├── health/         [System Diagnostic & Liveness Check Domain]
│   ├── inventory/      [Hardware, Software, & Security Asset Discovery Domain]
│   ├── realtime/       [WebSocket Broker & Push Notification Gateway Domain]
│   ├── telemetry/      [High-Frequency Telemetry Ingestion & Pruning Domain]
│   ├── tenant/         [Organization Multi-Tenant & Quota Isolation Domain]
│   └── users/          [User Administration & Role-Based Access Domain]
└── prisma/             [Single-Source Database Schema Definition & Migrations]
```

#### Backend Boundary Enforcement:

- **`src/modules/<domain>/`**: Every module encapsulates its own controllers, services, DTOs, and repository logic. **Rule 3**: Module A may import services from Module B (via NestJS Module exports), but Module B must never import from Module A. No direct circular module bindings allowed.
- **`src/prisma/`**: Exclusively owned by Infrastructure Database engineering. Directly consumed by `PrismaService` inside `common/` or dedicated module repository injections. Never directly instantiated by controllers or external scripts.

---

### Internal Architecture of `apps/frontend/`

```
apps/frontend/src/
├── app/                [Next.js App Router Pages, Layouts, & Route Handlers]
├── components/         [Shared Universal UI Elements - Cards, Buttons, Tables]
├── features/
│   ├── alerts/         [Alert Rules Studio & Incident Investigation UI]
│   ├── auth/           [Authentication Screens & Session Wrappers]
│   ├── dashboard/      [Real-Time KPI Dashboards & Analytics UI]
│   ├── device/         [Node Registry & Target Management UI]
│   ├── fleet/          [Registration Key & Smart Group Configuration UI]
│   ├── inventory/      [Deep Asset Inspection & Hardware Breakdown UI]
│   └── realtime/       [WebSocket Client Providers & Event Listeners]
├── lib/                [Application Client Services & Transport Utilities]
└── types/              [Frontend-Specific View Model Assertions]
```

#### Frontend Boundary Enforcement:

- **`src/features/<domain>/`**: Encapsulates self-contained presentation components, state hooks, and domain-specific view logic. Feature modules must never cross-import internal implementation files of another feature module; communication occurs via universal state stores or routed URL parameters.
- **`src/app/`**: Route definition layer only. Must not contain thick business logic or complex data parsing; all heavy transformations delegate to dedicated feature modules or client services.

---

### Internal Architecture of `apps/agent/`

```
apps/agent/
├── Config/             [Typed Environment & AppSettings Configuration Binding]
├── Services/           [Clean Architecture Collector Abstractions & Core Logic]
│   ├── IMetricCollector.cs
│   ├── WindowsMetricCollector.cs
│   ├── LinuxMetricCollector.cs
│   ├── SimulationMetricCollector.cs
│   └── SystemDiagnosticsService.cs
└── Program.cs          [Dependency Injection Container & Daemon Bootstrapper]
```

#### Agent Boundary Enforcement:

- **`Services/IMetricCollector.cs`**: Pure interface boundary. Platform implementations (`WindowsMetricCollector.cs`, `LinuxMetricCollector.cs`, `SimulationMetricCollector.cs`) must never directly interact with transport serialization or network sockets; they exclusively generate deterministic diagnostic snapshots for consumption by `SystemDiagnosticsService`.

---

## 3. Structural Evaluation & Justification (ADR Alignment)

- **Problem**: Monolithic repository layouts often degrade into circular dependency spaghetti, hidden API calls, and domain boundary erosion.
- **Current Implementation**: A Turborepo monorepo clearly segregating applications (`apps/`) from immutable shared schemas (`packages/shared-types`).
- **Why Maintained & Formalized**: Existing module boundaries match enterprise DDD principles precisely. Re-organizing or redesigning folder topologies would cause immense code churn with zero functional gain.
- **Decision**: Formalize all existing folders as strict bounded contexts with explicit ownership and dependency prohibitions.
