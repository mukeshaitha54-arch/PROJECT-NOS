/**
 * NOS Domain Events — Module 3 Constitutional Amendment
 * 
 * Typed domain event classes that eliminate string-based event emissions.
 * Every domain mutation is published as a typed class, subscribed to by
 * dedicated handlers (TimelineHandler, RealtimeHandler, AnalyticsHandler).
 * 
 * Constitutional Rule: Business services MUST emit domain events.
 * They MUST NEVER call TimelineService.logEvent() or SocketPublisher directly.
 */
import { v4 as uuidv4 } from 'uuid';

// ── Base Domain Event ─────────────────────────────────────────────────────────

export abstract class BaseDomainEvent {
  /** Unique event identifier (UUID v4) */
  readonly eventId: string;
  /** ISO-8601 UTC timestamp of event creation */
  readonly timestamp: string;
  /** Correlation ID for cross-layer tracing */
  readonly correlationId: string;
  /** Abstract event type discriminator (e.g., 'device.registered') */
  abstract readonly eventType: string;

  constructor(
    public readonly organizationId: string,
    public readonly deviceId: string,
    correlationId?: string,
  ) {
    this.eventId = uuidv4();
    this.timestamp = new Date().toISOString();
    this.correlationId = correlationId || uuidv4();
  }
}

// ── Device Domain Events ──────────────────────────────────────────────────────

export class DeviceRegisteredEvent extends BaseDomainEvent {
  readonly eventType = 'device.registered' as const;

  constructor(
    organizationId: string,
    deviceId: string,
    public readonly hostname: string,
    public readonly os: string,
    public readonly osVersion: string,
    public readonly architecture: string,
    public readonly agentVersion: string,
    correlationId?: string,
  ) {
    super(organizationId, deviceId, correlationId);
  }
}

export class DeviceReconnectedEvent extends BaseDomainEvent {
  readonly eventType = 'device.reconnected' as const;

  constructor(
    organizationId: string,
    deviceId: string,
    public readonly hostname: string,
    correlationId?: string,
  ) {
    super(organizationId, deviceId, correlationId);
  }
}

export class HeartbeatReceivedEvent extends BaseDomainEvent {
  readonly eventType = 'heartbeat.received' as const;

  constructor(
    organizationId: string,
    deviceId: string,
    public readonly ipAddress: string,
    public readonly cpuUsage: number,
    public readonly ramUsage: number,
    public readonly uptime: number,
    public readonly wasOffline: boolean,
    correlationId?: string,
  ) {
    super(organizationId, deviceId, correlationId);
  }
}

export class DeviceOfflineEvent extends BaseDomainEvent {
  readonly eventType = 'device.offline' as const;

  constructor(
    organizationId: string,
    deviceId: string,
    public readonly reason: string,
    correlationId?: string,
  ) {
    super(organizationId, deviceId, correlationId);
  }
}

export class DeviceMaintenanceEvent extends BaseDomainEvent {
  readonly eventType = 'device.maintenance' as const;

  constructor(
    organizationId: string,
    deviceId: string,
    public readonly enabled: boolean,
    public readonly actorId?: string,
    public readonly actorName?: string,
    correlationId?: string,
  ) {
    super(organizationId, deviceId, correlationId);
  }
}

export class DeviceRetiredEvent extends BaseDomainEvent {
  readonly eventType = 'device.retired' as const;

  constructor(
    organizationId: string,
    deviceId: string,
    public readonly actorId?: string,
    public readonly actorName?: string,
    correlationId?: string,
  ) {
    super(organizationId, deviceId, correlationId);
  }
}

export class DeviceClaimedEvent extends BaseDomainEvent {
  readonly eventType = 'device.claimed' as const;

  constructor(
    organizationId: string,
    deviceId: string,
    public readonly claimedByUserId: string,
    public readonly teamId?: string,
    public readonly departmentId?: string,
    correlationId?: string,
  ) {
    super(organizationId, deviceId, correlationId);
  }
}

export class DeviceBulkStatusEvent extends BaseDomainEvent {
  readonly eventType = 'device.bulk_status' as const;

  constructor(
    organizationId: string,
    deviceId: string,
    public readonly newStatus: string,
    public readonly actorId?: string,
    public readonly actorName?: string,
    correlationId?: string,
  ) {
    super(organizationId, deviceId, correlationId);
  }
}

// ── Telemetry Domain Events ───────────────────────────────────────────────────

export class TelemetryReceivedEvent extends BaseDomainEvent {
  readonly eventType = 'telemetry.received' as const;

  constructor(
    organizationId: string,
    deviceId: string,
    public readonly snapshot: Record<string, any>,
    correlationId?: string,
  ) {
    super(organizationId, deviceId, correlationId);
  }
}

// ── Inventory Domain Events ───────────────────────────────────────────────────

export class InventoryUpdatedEvent extends BaseDomainEvent {
  readonly eventType = 'inventory.updated' as const;

  constructor(
    organizationId: string,
    deviceId: string,
    public readonly inventoryVersion: number,
    public readonly fingerprint: string,
    public readonly diffDetected: boolean,
    public readonly changeSummary: string,
    correlationId?: string,
  ) {
    super(organizationId, deviceId, correlationId);
  }
}

// ── Event Type Union (for typed handler registration) ─────────────────────────

export type DomainEvent =
  | DeviceRegisteredEvent
  | DeviceReconnectedEvent
  | HeartbeatReceivedEvent
  | DeviceOfflineEvent
  | DeviceMaintenanceEvent
  | DeviceRetiredEvent
  | DeviceClaimedEvent
  | DeviceBulkStatusEvent
  | TelemetryReceivedEvent
  | InventoryUpdatedEvent;

// ── Event Name Constants (matching eventType for NestJS EventEmitter) ─────────
// These are used as OnEvent() decorator arguments — typed, not stringly-typed.

export const DomainEventNames = {
  DEVICE_REGISTERED: 'device.registered',
  DEVICE_RECONNECTED: 'device.reconnected',
  HEARTBEAT_RECEIVED: 'heartbeat.received',
  DEVICE_OFFLINE: 'device.offline',
  DEVICE_MAINTENANCE: 'device.maintenance',
  DEVICE_RETIRED: 'device.retired',
  DEVICE_CLAIMED: 'device.claimed',
  DEVICE_BULK_STATUS: 'device.bulk_status',
  TELEMETRY_RECEIVED: 'telemetry.received',
  INVENTORY_UPDATED: 'inventory.updated',
} as const;
