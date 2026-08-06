# NOS Security Architecture, Logging & Observability Standards v1.0

This document defines the enterprise security model, multi-tenant compliance guarantees, and logging/observability specifications for the Neural Operating System (NOS). Every module must adhere to these defensive practices to ensure platform integrity and complete regulatory auditability.

---

## 1. Security Architecture & Threat Mitigation Matrix

### 1. Multi-Tenant Isolation & Zero Data Leakage (RBAC & ABAC)
- **Top-Level Isolation**: Every business table in PostgreSQL directly or indirectly links to `organizationId`. Backend repositories (`apps/backend/src/modules/*`) are constitutionally forbidden from executing unbounded `findAll()` database queries. All SQL reads and mutations must enforce a mandatory `.where({ organizationId })` filter derived exclusively from the authenticated user's session token.
- **Role-Based Access Control (RBAC)**: Enforced via NestJS Role Guards across all endpoints. Ten canonical roles are defined in `Role` enums (`OWNER`, `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `OPERATOR`, `ANALYST`, `VIEWER`, `AUDITOR`, `CUSTOM_ROLE`, `USER`). Attempting to access administrative routes without adequate permissions triggers an immediate `403 Forbidden` security exception.

### 2. Cryptographic Secret & Token Management
- **JWT Lifecycle & Storage**:
  - Access Tokens: Statelessly verified, signed using HMAC-SHA256 (or RSA private/public keys in enterprise production) with an enforced maximum expiration timeframe of **15 minutes**.
  - Refresh Tokens & Device Keys: Raw refresh tokens and agent Registration Keys are **never** persisted in plain text within database tables. All stored tokens utilize salted cryptographic hashes (`refresh_tokens.tokenHash`, `api_keys.tokenHash`, `registration_keys.keyHash`). Upon token validation, incoming secrets are hashed in-memory and compared using constant-time evaluation algorithms to eliminate timing side-channel attacks.
- **Secret Management**: Application database connection strings, JWT signing keys, and Redis passwords load exclusively from secure environment bindings via NestJS `ConfigModule`. Hardcoding cryptographic keys or fallback demo passwords in source code is an immediate build-blocking violation.

### 3. Defensive Web & API Protections (OWASP Top 10 Alignment)

| Vector / Vulnerability | Architectural Protection Policy & Implementation | Verified Infrastructure Layer |
| :--- | :--- | :--- |
| **SQL Injection (SQLi)** | Raw string-concatenated SQL queries are constitutionally banned. All database interaction strictly passes through the parameterized type-safe Prisma ORM query engine. | `apps/backend/src/prisma/` |
| **Cross-Site Scripting (XSS)**| Next.js App Router automatically escapes all rendered DOM data. Incoming user content in comments or profiles is sanitized via backend validation filters before persistence. | `apps/frontend/`, `apps/backend/common/` |
| **Cross-Site Request Forgery (CSRF)**| State-changing operator API endpoints require custom authorization Bearer headers (`Authorization: Bearer <jwt>`), neutralizing standard browser cookie-driven CSRF exploitation. | `apps/backend/common/guards/` |
| **CORS Abuse** | Cross-Origin Resource Sharing is strictly confined to explicitly verified frontend deployment domain hosts. Wildcard (`*`) CORS configuration is forbidden in production environments. | `apps/backend/src/main.ts` |
| **Replay & DoS Attacks** | High-frequency telemetry and login endpoints implement sliding window rate limiting (via Redis rate-limiter algorithms). Replayed old timestamp heartbeats outside a 60-second operational tolerance window are rejected. | `apps/backend/src/modules/telemetry/`|

---

## 2. Enterprise Audit Logging & Observability Standards

To achieve instant operational observability and defensible forensic compliance, NOS implements a standardized structured logging and tracing framework across all execution environments.

### 1. Mandatory Structured JSON Logging
All console logs, server diagnostic output, and worker traces must be emitted in unified structured JSON syntax. Unstructured human-readable string dumps (e.g., `console.log("Device added")`) violate quality gates and break SIEM log parsers.

#### Standard Log Event JSON Structure:
```json
{
  "timestamp": "2026-07-28T18:45:01.294Z",
  "level": "INFO",
  "service": "nos-backend",
  "module": "device",
  "correlationId": "cor-8b9a-412f-b981-0d7e6a5f210a",
  "tenantId": "org-prod-4091",
  "userId": "usr-admin-8821",
  "action": "DEVICE_REGISTERED",
  "message": "Enrolled new target infrastructure node server-prod-01",
  "metadata": { "deviceId": "dev-9912", "os": "Linux", "ip": "10.0.4.12" }
}
```

---

### 2. Distributed Tracing & Correlation ID Propagation
Every external HTTP request entering the backend gateway or telemetry stream receives an immutable UUID v4 header: `X-Correlation-ID` (generated automatically if missing from trusted upstream load balancers).
- **Service Continuity**: This identifier is bound to NestJS asynchronous execution context registers (`AsyncLocalStorage`). Every database query, Redis Pub/Sub broadcast, and outbound notification log generated during that lifecycle embeds the exact same `correlationId`, enabling seamless end-to-end trace mapping across distributed micro-services and audit ledgers.

---

### 3. Error Classification & Handling Taxonomy
All backend operational faults and exceptions are categorized into four standardized tiers before external propagation:

| Tier & Classification | HTTP Status Equivalent | Handling Action & Logging Behavior | Client Exposure Rule |
| :--- | :--- | :--- | :--- |
| **Tier 1: Domain Validation Fault**| `400 Bad Request` / `422 Unprocessable` | Logged at `WARN` level with field validation breakdown. | Returns structured JSON error identifying failed DTO constraint rules without exposing internal stack traces. |
| **Tier 2: Security & Authentication Fault**| `401 Unauthorized` / `403 Forbidden` | Logged at `WARN`/`ERROR` level; increment rate-limit failure tracker; write security audit event if threshold exceeded. | Returns standard generic security refusal response without disclosing database table existence or user existence. |
| **Tier 3: Resource Lookup Fault** | `404 Not Found` | Logged at `INFO` level. | Returns standard resource missing response. |
| **Tier 4: System Unhandled Exception**| `500 Internal Server Error` | Logged immediately at `CRITICAL` level with full system stack trace, memory profile, and context metadata. Trigger developer alert alarms. | Returns generic opaque error code (`INTERNAL_SERVER_ERROR`) with `correlationId` reference. **Zero raw stack trace exposure** to clients. |

---

### 4. Enterprise Regulatory Audit Ledgers
In alignment with enterprise compliance requirements (SOC2, ISO27001, HIPAA), NOS maintains immutable audit logging tables (`audit_logs`, `alert_rule_audit_logs`, `inventory_audit_logs`, `device_timeline_events`).
- **Immutability Guarantee**: Once an audit event is recorded in PostgreSQL, existing backend APIs provide **zero** update or delete route handlers for audit records. Audit data persists strictly until expired by high-level institutional retention archiving schedules.
