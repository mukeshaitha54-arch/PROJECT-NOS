/**
 * TimelineHandler — Domain Event Subscriber
 * 
 * Constitutional Mandate (§8.6): Timeline insertions occur EXCLUSIVELY
 * via domain event subscriptions. Business services MUST NOT call
 * TimelineService.logEvent() directly.
 * 
 * This handler listens for all domain events and creates the appropriate
 * timeline entries automatically.
 */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DeviceTimelineService } from '../services/device-timeline.service';
import {
  DomainEventNames,
  DeviceRegisteredEvent,
  DeviceReconnectedEvent,
  HeartbeatReceivedEvent,
  DeviceOfflineEvent,
  DeviceMaintenanceEvent,
  DeviceRetiredEvent,
  DeviceClaimedEvent,
  DeviceBulkStatusEvent,
  TelemetryReceivedEvent,
  InventoryUpdatedEvent,
} from '../../../common/events/domain-events';

@Injectable()
export class TimelineHandler {
  private readonly logger = new Logger(TimelineHandler.name);

  constructor(private readonly timelineService: DeviceTimelineService) {}

  @OnEvent(DomainEventNames.DEVICE_REGISTERED)
  async onDeviceRegistered(event: DeviceRegisteredEvent): Promise<void> {
    try {
      await this.timelineService.logEvent({
        deviceId: event.deviceId,
        eventType: 'REGISTERED',
        severity: 'INFO',
        title: 'Agent Registered',
        detail: `Monitoring agent registered for host ${event.hostname} (${event.os} ${event.architecture}, Agent v${event.agentVersion}).`,
        metadata: {
          os: event.os,
          osVersion: event.osVersion,
          agentVersion: event.agentVersion,
          correlationId: event.correlationId,
        },
      });
    } catch (err: any) {
      this.logger.error(`Timeline write failed for ${event.eventType}: ${err.message}`);
    }
  }

  @OnEvent(DomainEventNames.DEVICE_RECONNECTED)
  async onDeviceReconnected(event: DeviceReconnectedEvent): Promise<void> {
    try {
      await this.timelineService.logEvent({
        deviceId: event.deviceId,
        eventType: 'ONLINE',
        severity: 'SUCCESS',
        title: 'Agent Reconnected',
        detail: `Agent re-established Zero-Trust session from host ${event.hostname}.`,
        metadata: { correlationId: event.correlationId },
      });
    } catch (err: any) {
      this.logger.error(`Timeline write failed for ${event.eventType}: ${err.message}`);
    }
  }

  @OnEvent(DomainEventNames.HEARTBEAT_RECEIVED)
  async onHeartbeatReceived(event: HeartbeatReceivedEvent): Promise<void> {
    try {
      // Only log timeline entry when device transitions from OFFLINE → ONLINE
      if (event.wasOffline) {
        await this.timelineService.logEvent({
          deviceId: event.deviceId,
          eventType: 'ONLINE',
          severity: 'SUCCESS',
          title: 'Device Reconnected',
          detail: `Device returned ONLINE via live heartbeat ingestion (${event.ipAddress}).`,
          metadata: {
            ipAddress: event.ipAddress,
            cpuUsage: event.cpuUsage,
            ramUsage: event.ramUsage,
            correlationId: event.correlationId,
          },
        });
      }
    } catch (err: any) {
      this.logger.error(`Timeline write failed for ${event.eventType}: ${err.message}`);
    }
  }

  @OnEvent(DomainEventNames.DEVICE_OFFLINE)
  async onDeviceOffline(event: DeviceOfflineEvent): Promise<void> {
    try {
      await this.timelineService.logEvent({
        deviceId: event.deviceId,
        eventType: 'OFFLINE',
        severity: 'WARNING',
        title: 'Device Offline',
        detail: `Device marked OFFLINE: ${event.reason}.`,
        metadata: { correlationId: event.correlationId },
      });
    } catch (err: any) {
      this.logger.error(`Timeline write failed for ${event.eventType}: ${err.message}`);
    }
  }

  @OnEvent(DomainEventNames.DEVICE_MAINTENANCE)
  async onDeviceMaintenance(event: DeviceMaintenanceEvent): Promise<void> {
    try {
      await this.timelineService.logEvent({
        deviceId: event.deviceId,
        eventType: event.enabled ? 'MAINTENANCE_START' : 'MAINTENANCE_END',
        severity: 'INFO',
        title: event.enabled ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled',
        detail: event.enabled
          ? `Device placed in maintenance mode by ${event.actorName || 'operator'}. Alert evaluation suspended.`
          : `Device resumed active operational monitoring.`,
        actorId: event.actorId,
        actorName: event.actorName,
        metadata: { correlationId: event.correlationId },
      });
    } catch (err: any) {
      this.logger.error(`Timeline write failed for ${event.eventType}: ${err.message}`);
    }
  }

  @OnEvent(DomainEventNames.DEVICE_RETIRED)
  async onDeviceRetired(event: DeviceRetiredEvent): Promise<void> {
    try {
      await this.timelineService.logEvent({
        deviceId: event.deviceId,
        eventType: 'OFFLINE',
        severity: 'WARNING',
        title: 'Device Retired',
        detail: `Device retired from active operations by ${event.actorName || 'administrator'}.`,
        actorId: event.actorId,
        actorName: event.actorName,
        metadata: { correlationId: event.correlationId },
      });
    } catch (err: any) {
      this.logger.error(`Timeline write failed for ${event.eventType}: ${err.message}`);
    }
  }

  @OnEvent(DomainEventNames.DEVICE_CLAIMED)
  async onDeviceClaimed(event: DeviceClaimedEvent): Promise<void> {
    try {
      await this.timelineService.logEvent({
        deviceId: event.deviceId,
        eventType: 'SYSTEM_EVENT',
        severity: 'SUCCESS',
        title: 'Device Claimed',
        detail: `Device was claimed and assigned to a team/department by operator.`,
        actorId: event.claimedByUserId,
        metadata: {
          teamId: event.teamId,
          departmentId: event.departmentId,
          correlationId: event.correlationId,
        },
      });
    } catch (err: any) {
      this.logger.error(`Timeline write failed for ${event.eventType}: ${err.message}`);
    }
  }

  @OnEvent(DomainEventNames.DEVICE_BULK_STATUS)
  async onBulkStatus(event: DeviceBulkStatusEvent): Promise<void> {
    try {
      await this.timelineService.logEvent({
        deviceId: event.deviceId,
        eventType: event.newStatus === 'MAINTENANCE' ? 'MAINTENANCE_START' : 'CONFIG_CHANGE',
        severity: 'INFO',
        title: `Bulk Status Update: ${event.newStatus}`,
        detail: `Status updated to ${event.newStatus} via bulk operations toolbar.`,
        actorId: event.actorId,
        actorName: event.actorName,
        metadata: { correlationId: event.correlationId },
      });
    } catch (err: any) {
      this.logger.error(`Timeline write failed for ${event.eventType}: ${err.message}`);
    }
  }

  @OnEvent(DomainEventNames.INVENTORY_UPDATED)
  async onInventoryUpdated(event: InventoryUpdatedEvent): Promise<void> {
    try {
      await this.timelineService.logEvent({
        deviceId: event.deviceId,
        eventType: event.diffDetected ? 'INVENTORY_DIFF' : 'INVENTORY_UPDATED',
        severity: event.diffDetected ? 'WARNING' : 'INFO',
        title: event.diffDetected ? 'Inventory Change Detected' : 'Inventory Snapshot Updated',
        detail: event.changeSummary || `Inventory version ${event.inventoryVersion} recorded.`,
        metadata: {
          inventoryVersion: event.inventoryVersion,
          fingerprint: event.fingerprint,
          correlationId: event.correlationId,
        },
      });
    } catch (err: any) {
      this.logger.error(`Timeline write failed for ${event.eventType}: ${err.message}`);
    }
  }
}
