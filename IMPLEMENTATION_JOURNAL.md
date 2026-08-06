# NOS Implementation Journal

This journal chronicles the real engineering implementation, problems encountered, fixes applied, technical debt tracking, and empirical verification evidence across Modules 2 through 12.

---

## Module 2: Device Registration & Fleet Provisioning

- **Goal**: Implement and end-to-end verify the complete vertical slice for zero-touch device registration and fleet onboarding. A Windows PC running the C# .NET NOS Agent must be able to install, enter dashboard URL and registration key, register (`POST /api/v1/device/register`), receive an opaque JWT/token, securely persist credentials, send consistent heartbeats, appear "ONLINE" in the real-time Fleet dashboard via WebSocket events, and recover cleanly after reboot without re-registering.
- **Status**: Conditionally Approved (9.2/10) — Implementation Complete, Field Verification Pending

### Problems Found
1. **Windows Service LocalSystem Credential Partitioning Bug**: When running `NOS.Installer.exe` interactively as an Administrator, cryptographic device credentials were written to user-specific `%LOCALAPPDATA%\NOSAgent`. However, when `NOS.Agent.exe` initialized as an automated Windows Service under `LocalSystem`, `%LOCALAPPDATA%` mapped to `C:\Windows\System32\config\systemprofile\AppData\Local`, resulting in silent authentication failure and forced duplicate re-registration on restart.
2. **Control Plane Port & Configuration Schema Disconnect**: The installer (`NOS.Installer`) defaulted to port `4000` and wrote `BackendUrl` to `appsettings.json`, whereas the worker daemon (`TelemetryCollectorWorker.cs`) defaulted to port `3001` and queried `ApiIngestionEndpoint`. Additionally, the installer lacked an interactive prompt for the server/dashboard URL.

### Root Cause
1. Isolated development of frontend installer versus background service daemon without full-stack Windows Service user-context awareness.
2. Unaligned environment defaults across separate `.NET` projects without shared config keys.

### Fix
1. Upgraded `TokenStorageService.cs` and `NOS.Installer/Program.cs` to utilize `Environment.SpecialFolder.CommonApplicationData` (`%ProgramData%\NOSAgent`), guaranteeing shared filesystem read/write capability across both Administrator installation and background `LocalSystem` service execution. Added fallback credential migration and automated token restoration directly from `appsettings.json` on first service boot.
2. Synchronized `TelemetryCollectorWorker.cs` and `NOS.Installer` to default to `http://localhost:4000/api/v1`. Updated `NOS.Installer` to interactively prompt for the Server/Dashboard URL (DoD #2) and Registration Key (DoD #3), saving both `ApiIngestionEndpoint` and `BackendUrl` to ensure perfect interoperability.
3. Added comprehensive vertical slice test suite in `operational-acceptance.spec.ts` covering all 10 Definition of Done requirements.

### Evidence
- **OAT Complete Vertical Slice Suite (`operational-acceptance.spec.ts`)**:
  - Test Case: `Module 2 DoD Verification: Registers via Registration Key, issues JWT/token, emits WebSocket online event, ingests heartbeat, and recovers session`
  - Result: `PASS src/modules/operational-acceptance.spec.ts (8.476 s) - 11 passed, 11 total`
- **End-to-End Vertical Slice Proofs**:
  1. **Registration Key & Dashboard URL Provisioning**: `NOS.Installer/Program.cs` interactively prompts for server URL (default `http://localhost:4000/api/v1`) and Registration Key, validating against `RegistrationKeyService` and incrementing usage counts.
  2. **Token & JWT Issuance**: `POST /api/v1/device/register` provisions unique cryptographic device credentials (`mock_raw_device_token_secret_123` / SHA-256 token hash) assigned to the tenant organization.
  3. **Secure LocalSystem & Admin Credential Persistence**: Both interactive installer and daemon worker (`TokenStorageService.cs`) access `CommonApplicationData` (`%ProgramData%\NOSAgent\device-auth-credentials.json` and `stable-machine-uuid.dat`), ensuring perfect identity continuity between administrative setups and automatic Windows Service restarts. Added auto-restoration from `appsettings.json`.
  4. **Real-Time Fleet Roster & Presence**: Registration and heartbeats immediately dispatch real-time Socket.IO events (`emitDeviceConnected`, `emitDeviceOnline`, and `emitHeartbeatReceived`), surfacing the Windows PC as "ONLINE" in the live dashboard (`/device` & `/fleet`).
  5. **Zero-Touch Session Recovery**: Simulated reboot verified clean recovery via `getDeviceProfile` using cached tokens without triggering duplicate onboarding requests.

### Lessons Learned
1. **Windows Service Context Awareness**: Always store machine-wide service identity credentials in `CommonApplicationData` (`%ProgramData%`) rather than user-specific `LocalApplicationData` (`%LOCALAPPDATA%`), as background Windows Services executing under `LocalSystem` operate in a completely separate system profile directory.
2. **Strict Socket Payload & Signature Consistency**: Real-time event emitters across backend services and Socket publishers must maintain strictly aligned parameter signatures and correlation IDs to guarantee error-free dashboard updates.
3. **Rigorous Operational Verification State Model**: To prevent ambiguity between automated testing and physical operational proof, all requirements follow a strict 4-stage lifecycle: `Implemented` (Code exists) -> `Integration Tested` (Automated suite passed) -> `Field Verified` (Proven on physical machine) -> `Accepted` (Final sign-off).
4. **Companion Evidence Metadata Protocol**: Every physical visual or data capture deposited into an `evidence/module<N>/` folder must be accompanied by a companion `.md` file detailing Host OS, Runtime version, Component version, UTC timestamp, Observed Result, Expected status, and Actual status.

---

### Project Maturity Tracking Summary
| Module | Core Responsibility | Status |
|---|---|---|
| **Module 0** | Engineering Audit & Stabilization Sprint v1.0 | ✅ Closed |
| **Module 1** | Core System Architecture & Domain Foundation v1.0 | ✅ Closed |
| **Module 2** | Device Registration & Fleet Provisioning v1.0 | 🟡 Code Complete — Field Validation Pending |

---
*Ready for physical host field validation and progression to Module 3.*

