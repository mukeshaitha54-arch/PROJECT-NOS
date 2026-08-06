import { Injectable, Inject, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  SocketEvents,
  SocketRooms,
  getDeviceRoom,
  SocketEventEnvelope,
} from '@nos/shared-types';
import { ISocketPublisher } from '../../../common/services/socket-publisher.interface';
import { ISocketEventBus, ISocketEventBusToken } from '../../../common/services/socket-event-bus.interface';
import { SocketMetricsService } from './socket-metrics.service';

@Injectable()
export class SocketPublisherService implements ISocketPublisher {
  private readonly logger = new Logger(SocketPublisherService.name);
  private server?: Server;

  // SPL Feature 10: Payload Deduplication TTL Map (Hash Key -> timestamp ms)
  private readonly dedupCache = new Map<string, number>();
  private readonly DEDUP_TTL_MS = 1500; // 1.5 second window to discard duplicate identical blasts

  constructor(
    @Inject(ISocketEventBusToken) private readonly eventBus: ISocketEventBus,
    private readonly metrics: SocketMetricsService,
  ) {
    // Self-cleaning GC for deduplication map (SPL Feature 15)
    const timer = setInterval(() => this.cleanupDedup(), 30000);
    if (timer && typeof timer.unref === 'function') {
      timer.unref();
    }
  }

  public setServer(server: Server): void {
    this.server = server;
    this.logger.log('Socket.IO Server instance registered in SocketPublisherService.');
  }

  async emitDeviceConnected(deviceId: string, payload: any, correlationId?: string): Promise<void> {
    const rooms = [SocketRooms.DASHBOARD, getDeviceRoom(deviceId)];
    await this.broadcast(SocketEvents.DEVICE_CONNECTED, rooms, payload, correlationId, `conn-${deviceId}`);
  }

  async emitDeviceDisconnected(deviceId: string, payload: any, correlationId?: string): Promise<void> {
    const rooms = [SocketRooms.DASHBOARD, getDeviceRoom(deviceId)];
    await this.broadcast(SocketEvents.DEVICE_DISCONNECTED, rooms, payload, correlationId, `disc-${deviceId}`);
  }

  async emitDeviceOnline(deviceId: string, payload: any, correlationId?: string): Promise<void> {
    const rooms = [SocketRooms.DASHBOARD, getDeviceRoom(deviceId)];
    await this.broadcast(SocketEvents.DEVICE_ONLINE, rooms, payload, correlationId, `online-${deviceId}`);
  }

  async emitDeviceOffline(deviceId: string, payload: any, correlationId?: string): Promise<void> {
    const rooms = [SocketRooms.DASHBOARD, getDeviceRoom(deviceId)];
    await this.broadcast(SocketEvents.DEVICE_OFFLINE, rooms, payload, correlationId, `offline-${deviceId}`);
  }

  async emitHeartbeatReceived(deviceId: string, payload: any, correlationId?: string): Promise<void> {
    const rooms = [SocketRooms.DASHBOARD, getDeviceRoom(deviceId)];
    // Deduplicate by heartbeat timestamp or cpu+ram state
    const dedupKey = `hb-${deviceId}-${payload.timestamp || payload.uptime}`;
    await this.broadcast(SocketEvents.HEARTBEAT_RECEIVED, rooms, payload, correlationId, dedupKey);
  }

  async emitTelemetryReceived(deviceId: string, payload: any, correlationId?: string): Promise<void> {
    const rooms = [SocketRooms.DASHBOARD, getDeviceRoom(deviceId)];
    const dedupKey = `tele-${deviceId}-${payload.timestamp || payload.id}`;
    await this.broadcast(SocketEvents.TELEMETRY_RECEIVED, rooms, payload, correlationId, dedupKey);
  }

  async emitInventoryUpdated(deviceId: string, payload: any, correlationId?: string): Promise<void> {
    const rooms = [SocketRooms.DASHBOARD, getDeviceRoom(deviceId)];
    const dedupKey = `inv-${deviceId}-${payload.inventoryVersion || payload.timestamp}`;
    await this.broadcast(SocketEvents.INVENTORY_UPDATED, rooms, payload, correlationId, dedupKey);
  }

  async emitDashboardUpdated(payload: any, correlationId?: string): Promise<void> {
    const rooms = [SocketRooms.DASHBOARD];
    await this.broadcast(SocketEvents.DASHBOARD_UPDATED, rooms, payload, correlationId);
  }

  async emitSystemStatusChanged(payload: any, correlationId?: string): Promise<void> {
    const rooms = [SocketRooms.DASHBOARD, SocketRooms.ADMINS, SocketRooms.OPERATORS];
    await this.broadcast(SocketEvents.SYSTEM_STATUS_CHANGED, rooms, payload, correlationId);
  }

  async emitAlertEvent(event: string, payload: any, correlationId?: string): Promise<void> {
    const rooms = [SocketRooms.DASHBOARD, SocketRooms.ADMINS, SocketRooms.OPERATORS];
    await this.broadcast(event as any, rooms, payload, correlationId);
  }

  async emitTenantEvent(organizationId: string, event: string, payload: any, correlationId?: string): Promise<void> {
    const rooms = [`org_${organizationId}`];
    await this.broadcast(event as any, rooms, payload, correlationId);
  }

  /**
   * Centralized selective broadcast engine.
   * Enforces SPL Feature 1 (Versioning), SPL Feature 2 (Correlation ID),
   * SPL Feature 10 (Deduplication), and SPL Feature 11 (Compression).
   */
  private async broadcast(
    event: SocketEvents,
    rooms: string[],
    payload: any,
    correlationId?: string,
    dedupKey?: string,
  ): Promise<void> {
    const now = Date.now();

    // 1. Deduplication evaluation
    if (dedupKey) {
      const existing = this.dedupCache.get(dedupKey);
      if (existing && (now - existing) < this.DEDUP_TTL_MS) {
        this.logger.debug(`Dropped duplicate socket broadcast event [${event}] Key: [${dedupKey}]`);
        this.metrics.recordDroppedEvent();
        return;
      }
      this.dedupCache.set(dedupKey, now);
    }

    // 2. Payload Minimization & Versioned Envelope creation
    const cleanPayload = this.minimizePayload(payload);
    const eventId = `evt-${now}-${Math.random().toString(36).substring(2, 8)}`;
    const deviceId = cleanPayload?.deviceId || cleanPayload?.snapshot?.deviceId || (dedupKey ? dedupKey.split('-')[1] : undefined);
    const envelope: SocketEventEnvelope = {
      eventId,
      eventType: event,
      version: 1,
      event,
      timestamp: new Date().toISOString(),
      organizationId: cleanPayload?.organizationId || 'default-org',
      deviceId,
      correlationId: correlationId || `nos-pub-${now}-${Math.random().toString(36).substring(2, 6)}`,
      payload: cleanPayload,
    };

    // 3. Publish to distributed event bus abstraction
    for (const room of rooms) {
      await this.eventBus.publish(room, event, envelope);
    }

    // 4. Selective Room Broadcasting with socket compression enabled (No Global Broadcasts)
    if (this.server) {
      try {
        this.server.to(rooms).compress(true).emit(event, envelope);
        this.logger.verbose(`Broadcasted [${event}] to rooms [${rooms.join(', ')}] CorId: [${envelope.correlationId}]`);
      } catch (err: any) {
        this.logger.error(`Failed to broadcast event [${event}] to rooms [${rooms.join(', ')}]: ${err.message}`, err.stack);
      }
    } else {
      this.logger.debug(`Socket server instance not ready yet. Event [${event}] queued to local event bus only.`);
    }
  }

  /**
   * SPL Feature 11: Payload Compression & Minimization
   * Removes undefined or bloated internal DB symbols before network transport.
   */
  private minimizePayload(data: any): any {
    if (!data || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map((item) => this.minimizePayload(item));

    const clean: any = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined && val !== null && typeof val !== 'function' && !key.startsWith('_') && !key.startsWith('$')) {
        clean[key] = typeof val === 'object' && !(val instanceof Date) ? this.minimizePayload(val) : val;
      }
    }
    return clean;
  }

  private cleanupDedup(): void {
    const now = Date.now();
    for (const [key, ts] of this.dedupCache.entries()) {
      if (now - ts > 30000) {
        this.dedupCache.delete(key);
      }
    }
  }
}
