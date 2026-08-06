// ============================================================================
// IDeviceTimelineRepository — Phase 7 Device Timeline
// Immutable, append-only event log per device.
// ============================================================================

export const IDeviceTimelineRepository = Symbol('IDeviceTimelineRepository');

export type TimelineEventType =
  | 'REGISTERED'
  | 'HEARTBEAT'
  | 'ONLINE'
  | 'OFFLINE'
  | 'INVENTORY_UPDATED'
  | 'INVENTORY_DIFF'
  | 'ALERT_TRIGGERED'
  | 'ALERT_ACKNOWLEDGED'
  | 'ALERT_ESCALATED'
  | 'ALERT_RESOLVED'
  | 'ALERT_SUPPRESSED'
  | 'MAINTENANCE_START'
  | 'MAINTENANCE_END'
  | 'AGENT_UPDATE'
  | 'CONFIG_CHANGE'
  | 'OPERATOR_NOTE'
  | 'SECURITY_EVENT'
  | 'SYSTEM_EVENT';

export type TimelineSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';

export interface CreateTimelineEventDto {
  deviceId: string;
  eventType: TimelineEventType;
  severity?: TimelineSeverity;
  title: string;
  detail?: string;
  actorId?: string;
  actorName?: string;
  relatedId?: string;
  relatedType?: string;
  metadata?: Record<string, unknown>;
}

export interface TimelineEventDto {
  id: string;
  deviceId: string;
  eventType: TimelineEventType;
  severity: TimelineSeverity;
  title: string;
  detail?: string;
  actorId?: string;
  actorName?: string;
  relatedId?: string;
  relatedType?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface PaginatedTimelineResponse {
  events: TimelineEventDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TimelineQueryOptions {
  deviceId: string;
  eventTypes?: TimelineEventType[];
  severity?: TimelineSeverity;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface IDeviceTimelineRepository {
  /**
   * Appends an immutable event to the device timeline.
   * This is the only write operation — timeline events are never mutated.
   */
  append(dto: CreateTimelineEventDto): Promise<TimelineEventDto>;

  /**
   * Retrieves paginated timeline events for a device,
   * ordered newest-first.
   */
  getPaginated(options: TimelineQueryOptions): Promise<PaginatedTimelineResponse>;

  /**
   * Retrieves the most recent N events for a device (for sidebar/preview).
   */
  getRecent(deviceId: string, limit?: number): Promise<TimelineEventDto[]>;
}
