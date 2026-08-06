/**
 * RealtimeHandler — Domain Event Subscriber for WebSocket Broadcasting
 * 
 * Constitutional Mandate (§8.6): Business services MUST NOT call
 * SocketPublisher methods directly. All real-time broadcasts are
 * triggered by domain event subscriptions.
 * 
 * Constitutional Mandate (§8.5): All WebSocket events use the
 * standard envelope: { eventId, eventType, timestamp, organizationId,
 * deviceId, correlationId, payload }.
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ISocketPublisherToken, ISocketPublisher } from '../../../common/services/socket-publisher.interface';
import {
  DomainEventNames,
  DeviceRegisteredEvent,
  DeviceReconnectedEvent,
  HeartbeatReceivedEvent,
  DeviceOfflineEvent,
  DeviceMaintenanceEvent,
  DeviceRetiredEvent,
  TelemetryReceivedEvent,
  InventoryUpdatedEvent,
} from '../../../common/events/domain-events';

@Injectable()
export class RealtimeHandler {
  private readonly logger = new Logger(RealtimeHandler.name);

  constructor(
    @Inject(ISocketPublisherToken)
    private readonly socketPublisher: ISocketPublisher,
  ) {}

  @OnEvent(DomainEventNames.DEVICE_REGISTERED)
  async onDeviceRegistered(event: DeviceRegisteredEvent): Promise<void> {
    try {
      await this.socketPublisher.emitDeviceConnected(event.deviceId, {
        id: event.deviceId,
        hostname: event.hostname,
        status: 'ONLINE',
        os: event.os,
        osVersion: event.osVersion,
        architecture: event.architecture,
        agentVersion: event.agentVersion,
        organizationId: event.organizationId,
      }, event.correlationId);

      await this.socketPublisher.emitDeviceOnline(event.deviceId, {
        deviceId: event.deviceId,
        status: 'ONLINE',
        timestamp: event.timestamp,
      }, event.correlationId);
    } catch (err: any) {
      this.logger.error(`Realtime broadcast failed for ${event.eventType}: ${err.message}`);
    }
  }

  @OnEvent(DomainEventNames.DEVICE_RECONNECTED)
  async onDeviceReconnected(event: DeviceReconnectedEvent): Promise<void> {
    try {
      await this.socketPublisher.emitDeviceOnline(event.deviceId, {
        deviceId: event.deviceId,
        status: 'ONLINE',
        timestamp: event.timestamp,
      }, event.correlationId);
    } catch (err: any) {
      this.logger.error(`Realtime broadcast failed for ${event.eventType}: ${err.message}`);
    }
  }

  @OnEvent(DomainEventNames.HEARTBEAT_RECEIVED)
  async onHeartbeatReceived(event: HeartbeatReceivedEvent): Promise<void> {
    try {
      await this.socketPublisher.emitHeartbeatReceived(event.deviceId, {
        deviceId: event.deviceId,
        cpuUsage: event.cpuUsage,
        ramUsage: event.ramUsage,
        uptime: event.uptime,
        ipAddress: event.ipAddress,
        timestamp: event.timestamp,
        status: 'ONLINE',
      }, event.correlationId);
    } catch (err: any) {
      this.logger.error(`Realtime broadcast failed for ${event.eventType}: ${err.message}`);
    }
  }

  @OnEvent(DomainEventNames.DEVICE_OFFLINE)
  async onDeviceOffline(event: DeviceOfflineEvent): Promise<void> {
    try {
      await this.socketPublisher.emitDeviceOffline(event.deviceId, {
        deviceId: event.deviceId,
        reason: event.reason,
        timestamp: event.timestamp,
      }, event.correlationId);
    } catch (err: any) {
      this.logger.error(`Realtime broadcast failed for ${event.eventType}: ${err.message}`);
    }
  }

  @OnEvent(DomainEventNames.DEVICE_MAINTENANCE)
  async onDeviceMaintenance(event: DeviceMaintenanceEvent): Promise<void> {
    try {
      await this.socketPublisher.emitSystemStatusChanged({
        deviceId: event.deviceId,
        status: event.enabled ? 'MAINTENANCE' : 'ONLINE',
        timestamp: event.timestamp,
      }, event.correlationId);
    } catch (err: any) {
      this.logger.error(`Realtime broadcast failed for ${event.eventType}: ${err.message}`);
    }
  }

  @OnEvent(DomainEventNames.DEVICE_RETIRED)
  async onDeviceRetired(event: DeviceRetiredEvent): Promise<void> {
    try {
      await this.socketPublisher.emitDeviceOffline(event.deviceId, {
        deviceId: event.deviceId,
        reason: 'DEVICE_RETIRED',
        timestamp: event.timestamp,
      }, event.correlationId);
    } catch (err: any) {
      this.logger.error(`Realtime broadcast failed for ${event.eventType}: ${err.message}`);
    }
  }

  @OnEvent(DomainEventNames.TELEMETRY_RECEIVED)
  async onTelemetryReceived(event: TelemetryReceivedEvent): Promise<void> {
    try {
      await this.socketPublisher.emitTelemetryReceived(
        event.deviceId,
        event.snapshot,
        event.correlationId,
      );
    } catch (err: any) {
      this.logger.error(`Realtime broadcast failed for ${event.eventType}: ${err.message}`);
    }
  }

  @OnEvent(DomainEventNames.INVENTORY_UPDATED)
  async onInventoryUpdated(event: InventoryUpdatedEvent): Promise<void> {
    try {
      await this.socketPublisher.emitInventoryUpdated(event.deviceId, {
        deviceId: event.deviceId,
        inventoryVersion: event.inventoryVersion,
        fingerprint: event.fingerprint,
        diffDetected: event.diffDetected,
        updatedFields: ['hardware', 'software', 'network', 'security'],
        timestamp: event.timestamp,
      }, event.correlationId);
    } catch (err: any) {
      this.logger.error(`Realtime broadcast failed for ${event.eventType}: ${err.message}`);
    }
  }
}
