# NOS — Windows Monitoring Agent Guide

## Overview

The NOS Monitoring Agent is a high-reliability .NET 8 Windows Background Service that runs autonomously on monitored endpoints.

---

## Key Features

1. **Zero-Trust Onboarding**: Generates a stable machine hardware UUID and registers with the control plane to receive cryptographic tokens.
2. **Continuous Collectors**: Priority-tiered background scheduling:
   - **Critical (10s)**: CPU, RAM, Heartbeat
   - **Standard (30s)**: Disk, Network, Top Processes
   - **Inventory (24h / On-Demand)**: Software, Services, Defender, BitLocker, USB Devices, Scheduled Tasks, GPU, S.M.A.R.T. disk health
3. **Offline Buffering**: Ring-buffer stored at `%ProgramData%\NOS\Agent\telemetry_buffer.json` (max 1000 snapshots). Automatically drains buffered snapshots upon server reconnect.
4. **Circuit Breaker**: Isolates failing collectors after 5 consecutive errors with a 2-minute cooldown window to ensure host system stability.

---

## Configuration (`appsettings.json`)

```json
{
  "AgentConfig": {
    "PollIntervalSeconds": 30,
    "InventoryIntervalHours": 24,
    "ApiIngestionEndpoint": "http://localhost:4000/api/v1",
    "WorkspaceId": "workspace-demo",
    "Buffer": {
      "MaxBufferSize": 1000,
      "DrainBatchSize": 10
    }
  }
}
```

---

## Service Installation (Windows)

```cmd
# Create Windows Service
sc.exe create NOSAgent binPath= "C:\Program Files\NOS\Agent\NOS.Agent.exe" start= auto

# Start Service
sc.exe start NOSAgent

# Check Status
sc.exe query NOSAgent
```
