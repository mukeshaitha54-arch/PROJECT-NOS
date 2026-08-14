# NOS Quality Gates, Coding Standards & Scalability Architecture v1.0

This specification formalizes the immutable quality gates, universal coding conventions, and comprehensive scalability bottleneck analysis for the Neural Operating System (NOS). Every future PR, feature implementation, and architectural design must verify compliance against these standards prior to code review and merger.

---

## 1. Immutable Engineering Quality Gates

In accordance with Phase 17 requirements and our verified Module 0 stabilization sprint, the following engineering constraints are permanent quality gates. **Any Pull Request violating even one of these rules must be rejected by automated CI/CD validation pipelines:**

| Gate Rule ID | Immutable Quality Mandate                     | Enforced Rationale & Verification Method                                                                                                                                  |
| :----------- | :-------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **QG-01**    | **No TODO or FIXME comments**                 | Deferred engineering tasks introduce permanent tech debt and incomplete domain execution. Code must be delivered fully realized or tracked in external project planners.  |
| **QG-02**    | **No placeholder or stub pages**              | Screens displaying "Coming Soon", "Under Construction", or dead mock presentation layouts violate Rule 4. Every UI view must connect to active live domain logic.         |
| **QG-03**    | **No unhandled `console.log` dumps**          | Unstructured logging leaks internal state to terminal logs and breaks production JSON parsers. Use verified structured logger abstractions exclusively.                   |
| **QG-04**    | **No dead or 404 navigation routes**          | Every clickable button, link, and sidebar element must terminate at a functional, fully implemented application screen or API endpoint.                                   |
| **QG-05**    | **No duplicate DTO or interface definitions** | Interfaces must exist as a single source of truth inside `packages/shared-types/` or centralized module boundaries. Copy-pasting interface schemas across apps is banned. |
| **QG-06**    | **No circular dependencies**                  | Monitored via static analysis linter rules (`eslint-plugin-import`). Module A may import Module B; Module B must never import Module A.                                   |
| **QG-07**    | **No fake production data or randomizers**    | Using `Math.random()`, fake mock service injection, or static metric approximations in runtime code violates Global Rule 9. All metrics reflect real domain sensors.      |
| **QG-08**    | **No static dashboards**                      | All rendered statistical totals, KPI summaries, and historical charts must dynamically evaluate backend database queries or live telemetry streams.                       |
| **QG-09**    | **No hidden or undocumented feature flags**   | Experimental logic or branching code paths without documented management ownership and architecture decision records (ADRs) are strictly prohibited.                      |
| **QG-10**    | **100% Automated Test Passing Mandatory**     | All unit tests and Operational Acceptance Test (OAT) suites (`npm test` in `apps/backend`) must pass cleanly with zero failures or suppressed assertions.                 |

---

## 2. Definitive Universal Coding Standards

To guarantee homogeneous code quality across TypeScript, NestJS, React, and C# runtime environments (Phase 15):

### 1. Naming & Case Conventions

- **TypeScript / JavaScript**:
  - `camelCase`: Used for variables, function names, database property names, and REST URL query parameters (`cpuUsage`, `calculateThreshold`, `deviceId`).
  - `PascalCase`: Used for class names, TypeScript interfaces, Next.js UI React components, and DTO implementations (`RegisterDeviceDto`, `Sidebar`, `DeviceService`).
  - `UPPER_SNAKE_CASE`: Used for immutable constants, environment configuration bindings, and Enum literal members (`NODE_ENV`, `MAX_RETRIES`, `ONLINE`).
- **C# (.NET Agent)**:
  - `PascalCase`: Used for namespaces, classes, public interface names (prefixed with `I`, e.g., `IMetricCollector`), public properties, and method names (`WindowsMetricCollector`, `CollectMetricsAsync`).
  - `_camelCase` (with underscore prefix): Used for private read-only dependency injected field variable declarations (`_metricCollector`, _logger`).

### 2. Folder & File Organization Conventions

- TypeScript implementation files named in kebab-case or dot-notation indicating layer purpose (`device.controller.ts`, `device.service.ts`, `rule-simulation.service.spec.ts`).
- C# implementation files match the contained primary class name directly (`SystemDiagnosticsService.cs`).

### 3. Architectural Design Conventions (DTOs, Repositories, Errors)

- **DTO Convention**: Every data transfer across HTTP/WebSocket boundaries MUST employ an explicit DTO interface originating from `@nos/shared-types` with validation decorators applied at backend controllers.
- **Repository Convention**: Direct database invocation (`prisma.<table >.<action>`) is strictly quarantined within dedicated module service or repository files. Controllers must never invoke ORM methods directly.
- **Error Handling Convention**: Never silently swallow exceptions in empty `catch` blocks. All caught errors must either be re-thrown as typed HTTP domain exceptions (`HttpException`, `UnauthorizedException`) or logged with high-priority structural trace context before triggering graceful fallback routines.
- **Documentation Convention**: Every exported class, public service method, and complex algorithm must embed clean documentation comments (JSDoc `/** ... */` or XML doc strings `/// <summary>...`) detailing parameter requirements and expected return structures.

---

## 3. Comprehensive Scalability Architecture & Bottleneck Analysis (Phase 14)

As infrastructure fleets expand from individual evaluation deployments to hyper-scale enterprise SaaS installations, the architecture anticipates and remediates physical performance bottlenecks across all telemetry ingestion and visualization tiers:

| Roster Scale Tier                      | Projected Metric Velocity (at 10s Heartbeat intervals)  | Identified Hardware & Architecture Bottlenecks                                                                                                                                                                     | Mitigating Architectural Solutions & Scaling Strategy                                                                                                                                                                                                                                                  |
| :------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single Device** (1 Target Node)      | **0.1 requests/sec**<br>~8,640 snapshots/day            | None. Standard local monolith execution easily manages payload footprint on minimal CPU/RAM allocations.                                                                                                           | Basic local development stack (`docker-compose.dev.yml`) using standard single-instance PostgreSQL and Redis.                                                                                                                                                                                          |
| **10 Devices** (Lab / Demo Fleet)      | **1.0 requests/sec**<br>~86,400 snapshots/day           | Negligible database I/O overhead; localized React DOM re-render triggering during concurrent WebSocket metric broadcasts.                                                                                          | Use `React.memo` and throttled 5-second sampling intervals on frontend charts to ensure smooth client UX frame rates.                                                                                                                                                                                  |
| **100 Devices** (Medium Enterprise)    | **10.0 requests/sec**<br>~864,000 snapshots/day         | Database B-Tree index insertion overhead on `telemetry_snapshots`; Redis Socket.io single-thread event broadcast saturation during massive concurrent rule evaluations.                                            | Implement asynchronous batch insert buffers in `telemetry` application service; enable Redis Pub/Sub multi-room isolation (`room:org:<slug>`) to segment broadcast traffic.                                                                                                                            |
| **1,000 Devices** (Large Enterprise)   | **100.0 requests/sec**<br>~8.64 Million snapshots/day   | PostgreSQL lock contention during nightly retention deletion (`DELETE WHERE timestamp < ...`); Node.js event loop thread blocking during concurrent rule AST simulations; edge network ingestion bandwidth spikes. | Enforce Mandatory Agent Gzip Compression (reduces wire payload 85%); convert `telemetry_snapshots` into native time-based **Declarative Table Partitions** (daily/monthly); drop expired partitions via metadata instant deletion instead of row-by-row scans.                                         |
| **10,000 Devices** (Hyper-Scale Fleet) | **1,000.0 requests/sec**<br>~86.4 Million snapshots/day | Single-node PostgreSQL disk I/O saturation and connection pool starvation; single NestJS gateway container CPU exhaustion under SSL termination and token hashing load.                                            | Deploy horizontal multi-replica NestJS API containers behind load balancers with edge SSL termination; externalize time-series analytics storage to specialized columnar storage engines (**TimescaleDB** or **ClickHouse**); scale real-time sockets across isolated Redis Cluster adapter instances. |
