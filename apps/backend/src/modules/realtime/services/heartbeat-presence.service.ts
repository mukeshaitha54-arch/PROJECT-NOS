import { Injectable, Inject, Logger, OnModuleDestroy, forwardRef } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { ISocketPublisher, ISocketPublisherToken } from '../../../common/services/socket-publisher.interface';
import { RealtimeHeartbeatEvent } from '@nos/shared-types';

@Injectable()
export class HeartbeatPresenceService implements OnModuleDestroy {
  private readonly logger = new Logger(HeartbeatPresenceService.name);
  private readonly lastHeartbeatTimes = new Map<string, number>();
  private readonly STALE_THRESHOLD_MS = 90 * 1000; // 90 seconds (3 missed 30s heartbeats)
  private readonly sweepTimer?: NodeJS.Timeout;

  constructor(
    private readonly presenceService: PresenceService,
    @Inject(forwardRef(() => ISocketPublisherToken))
    private readonly socketPublisher: ISocketPublisher,
  ) {
    // Background sweep timer with unref to prevent blocking event loop and memory leaks (SPL Feature 15 & 18)
    this.sweepTimer = setInterval(() => this.sweepOfflineDevices(), 15000);
    if (this.sweepTimer && typeof this.sweepTimer.unref === 'function') {
      this.sweepTimer.unref();
    }
  }

  onModuleDestroy() {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
    }
    this.lastHeartbeatTimes.clear();
  }

  public async processHeartbeat(
    deviceId: string,
    ipAddress: string,
    cpuUsage: number,
    ramUsage: number,
    uptime: number,
    correlationId?: string,
  ): Promise<void> {
    const now = Date.now();
    const wasOnline = this.presenceService.isDeviceOnline(deviceId);

    this.lastHeartbeatTimes.set(deviceId, now);
    this.presenceService.updateDeviceOnline(deviceId, ipAddress, new Date(now));

    // SPL Feature 18: Offline Detection / State Transition Recovery
    if (!wasOnline) {
      this.logger.log(`Device [${deviceId}] re-established heartbeat. Transitioning to ONLINE.`);
      await this.socketPublisher.emitDeviceOnline(
        deviceId,
        { deviceId, ipAddress, timestamp: new Date(now).toISOString() },
        correlationId,
      );
    }

    const heartbeatEvent: RealtimeHeartbeatEvent = {
      deviceId,
      cpuUsage,
      ramUsage,
      uptime,
      ipAddress,
      timestamp: new Date(now).toISOString(),
      status: 'ONLINE',
    };

    await this.socketPublisher.emitHeartbeatReceived(deviceId, heartbeatEvent, correlationId);
  }

  private async sweepOfflineDevices(): Promise<void> {
    const now = Date.now();
    for (const [deviceId, lastSeen] of this.lastHeartbeatTimes.entries()) {
      if (now - lastSeen > this.STALE_THRESHOLD_MS) {
        this.logger.warn(`Device [${deviceId}] missed heartbeat threshold (${Math.round((now - lastSeen)/1000)}s). Marking OFFLINE.`);
        this.lastHeartbeatTimes.delete(deviceId);
        this.presenceService.updateDeviceOffline(deviceId);

        try {
          await this.socketPublisher.emitDeviceOffline(
            deviceId,
            { deviceId, reason: 'HEARTBEAT_TIMEOUT', timestamp: new Date(now).toISOString() },
            `nos-offline-sweep-${now}`,
          );
        } catch (err: any) {
          this.logger.error(`Error emitting offline transition for device [${deviceId}]: ${err.message}`);
        }
      }
    }
  }
}
