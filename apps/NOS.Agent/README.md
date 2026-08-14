# NOS Telemetry & Health Agent

Autonomous endpoint monitoring daemon for the **Neural Operating System (NOS)** platform. Built as a single-file, self-contained Windows x64 executable that runs on any modern Windows workstation or server without requiring the .NET runtime to be pre-installed.

---

## Capabilities & Architecture

- **Autonomous Auto-Registration**: Detects first launch, auto-registers with the NOS control plane via `POST /api/v1/device/register`, and secures credentials using Windows Data Protection API (DPAPI) and Windows Credential Manager.
- **Real-Time Telemetry Pipeline**: Collects CPU, Memory, Disk I/O, Network Throughput, System Uptime, and OS hardware inventory.
- **Offline Outbox Resilience**: High-durability SQLite outbox queue stores metrics during transient network drops and dispatches payloads upon connectivity restoration.
- **Adaptive Resource Throttling**: Monitors daemon CPU & RAM utilization with automated circuit breakers and exponential backoff to ensure negligible endpoint resource overhead.
- **Dual Runtime Modes**: Run interactively as a console application for testing, or deploy as a background Windows Service with automated start on boot.

---

## Quick Start (Interactive Console)

1. Download or locate `NOS.Agent.exe` (from `dist/agent/NOS.Agent.exe`).
2. Open PowerShell or Command Prompt.
3. Run in interactive console mode:
   ```cmd
   NOS.Agent.exe --console
   ```
4. The agent will initialize, register your workstation with the NOS control plane, and immediately stream heartbeats and telemetry to the dashboard.

---

## Windows Service Installation (Zero-Touch Background Mode)

To install and run the agent as a background Windows Service that automatically starts with Windows:

### 1. Install & Start Service (Run as Administrator)

```cmd
NOS.Agent.exe --install
```

### 2. Check Service Status

```cmd
sc.exe query "NOS Agent"
```

### 3. Uninstall / Remove Service

```cmd
NOS.Agent.exe --uninstall
```

---

## CLI Flags & Options

| Command / Flag       | Description                                                                |
| :------------------- | :------------------------------------------------------------------------- |
| `--console`          | Runs the agent in interactive foreground mode (default).                   |
| `--install`          | Registers and starts the daemon as a native Windows Service (`NOS Agent`). |
| `--uninstall`        | Stops and unregisters the Windows Service.                                 |
| `--start`            | Starts the installed Windows Service.                                      |
| `--stop`             | Stops the running Windows Service.                                         |
| `--server-url <url>` | Overrides control plane backend URL (default: `http://localhost:3001`).    |
| `--tenant-id <id>`   | Overrides organization/tenant ID (default: `default-org`).                 |
| `--device-id <id>`   | Overrides pre-provisioned device UUID (optional).                          |
| `--help`, `-h`       | Displays the help menu and usage instructions.                             |

---

## Configuration & Storage Hierarchy

Configuration values are evaluated and prioritized in the following order:

1. **Command Line Flags**: `--server-url`, `--tenant-id`, `--device-id`
2. **Environment Variables**: `NOS_AgentConfiguration__ServerUrl`, etc.
3. **Local AppData Config**: `%LOCALAPPDATA%\NOS\appsettings.json` and `%LOCALAPPDATA%\NOS\device.json`
4. **Windows Registry**: `HKLM\SOFTWARE\NOS\Agent` or `HKCU\SOFTWARE\NOS\Agent`
5. **Embedded Application Defaults**: `appsettings.json` (bundled inside the single-file EXE)

### Data & Credential Locations

- **Assigned Identity & Metadata**: `%LOCALAPPDATA%\NOS\device.json`
- **DPAPI-Encrypted Auth Token**: `%LOCALAPPDATA%\NOS\token.dat`
- **Windows Credential Manager**: Target `NOS_Agent_Token`
- **Offline Outbox Database**: `%LOCALAPPDATA%\NOS\outbox.db`

---

## Building the Single-File Executable

To compile a standalone, self-contained Windows executable from source:

### Using Batch Script

```cmd
scripts\build-agent.bat
```

### Using PowerShell

```powershell
.\scripts\build-agent.ps1
```

### Using .NET CLI Directly

```cmd
cd apps\NOS.Agent
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:PublishTrimmed=false -p:IncludeNativeLibrariesForSelfExtract=true -p:DebugType=none -p:DebugSymbols=false -o ..\..\dist\agent
```

Output binary: `dist\agent\NOS.Agent.exe` (~70 MB including complete .NET 8 runtime).

---

## Troubleshooting & Diagnostics

1. **Check Live Console Logs**:
   Run `NOS.Agent.exe --console` to view color-coded live logs.

2. **Check Windows Event Viewer**:
   - Open `eventvwr.msc` $\to$ **Windows Logs** $\to$ **Application**.
   - Filter by Source: `NOS-Agent`.
   - Event IDs:
     - `1000`: Authentication & Token events.
     - `1001`: Safe Mode & Circuit Breaker activation.
     - `1003`: Unhandled exceptions & crash diagnostics.

3. **Reset Local State**:
   To force re-registration as a fresh device, delete the local cache folder:
   ```powershell
   Remove-Item -Recurse -Force "$env:LOCALAPPDATA\NOS"
   ```
