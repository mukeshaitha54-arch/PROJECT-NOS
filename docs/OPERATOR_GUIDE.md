# NOS — Operator & NOC Guide

## Overview

This guide provides operational procedures for Network Operations Center (NOC) operators and system administrators managing monitored devices, alerts, and inventory using the NOS control plane.

---

## 1. Live NOC Dashboard (`/dashboard`)

The NOC Dashboard provides real-time visibility into all monitored devices without polling:

- **Online / Offline Cards**: Live device presence indicators powered by Socket.IO events.
- **Heartbeat Timeline**: Visual stream of live 30-second heartbeats.
- **Alert Feed**: Real-time incident feed (CRITICAL, HIGH, MEDIUM, LOW).
- **Device Heatmap**: Live grid of CPU %, RAM %, Disk %, and operational status.

---

## 2. Device Management (`/device`)

- **Roster View**: Search, filter by OS/status, and group devices.
- **Maintenance Mode**: Toggle maintenance mode (`POST /device/:id/maintenance`) to suspend alert rule evaluations during scheduled servicing.
- **Retire Device**: Mark device retired (`POST /device/:id/retire`).
- **Bulk Operations**: Select multiple nodes for batch status updates.
- **Device Timeline**: Review permanent operational timeline (`GET /device/:id/timeline`) detailing registration, heartbeats, status transitions, and alert history.

---

## 3. Incident Management (`/alerts`)

- **Alert Command Center**: Monitor active, acknowledged, snoozed, and resolved incidents.
- **Incident Detail View**:
  - **Acknowledge**: Assign ownership and add triage notes.
  - **Assign**: Assign to team members within the same organization (strict multi-tenant scope).
  - **Escalate**: Elevate incident severity tier (e.g. HIGH → CRITICAL).
  - **Correlated Alerts**: View related incidents on the same node within the temporal window.

---

## 4. Inventory Explorer (`/inventory`)

- **Global Inventory**: Search installed software, services, and security across all nodes.
- **Device Inventory Explorer**: Tabbed view of Hardware, Software, Services, Network, Security, and Extended JSON Blobs (Defender, BitLocker, USB, Scheduled Tasks, GPU, S.M.A.R.T. disk health).

---

## 5. Audit Portal (`/audit`)

- Filter audit logs by Action, Resource Type, User, or free-text search.
- Click any audit row to inspect full JSON payload details.
- Export official audit trail to CSV format.
