import { Injectable, Inject, Logger, NotFoundException, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Device, DeviceStatus } from '@prisma/client';
import { RegisterDeviceDto, HeartbeatDto } from './dto/device.dto';
import { IDeviceRepositoryToken, IDeviceRepository } from '../../common/repositories/device.repository.interface';
import { IHeartbeatRepositoryToken, IHeartbeatRepository } from '../../common/repositories/heartbeat.repository.interface';
import { IDeviceAuthenticatorToken, IDeviceAuthenticator } from '../../common/services/device-authenticator.interface';
import { HeartbeatPresenceService } from '../realtime/services/heartbeat-presence.service';
import { DeviceTimelineService } from './services/device-timeline.service';
import { RegistrationKeyService } from '../fleet/services/registration-key.service';
import { RegisterDeviceResponse, HeartbeatResponse, DeviceStatusResponse, Device as SharedDevice, Heartbeat as SharedHeartbeat } from '@nos/shared-types';
import {
  DeviceRegisteredEvent,
  DeviceReconnectedEvent,
  HeartbeatReceivedEvent,
  DeviceOfflineEvent,
  DeviceMaintenanceEvent,
  DeviceRetiredEvent,
  DeviceClaimedEvent,
  DeviceBulkStatusEvent,
} from '../../common/events/domain-events';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);
  private readonly STALE_HEARTBEAT_THRESHOLD_MS = 90 * 1000; // 90 seconds (3 missed 30s poll cycles)

  constructor(
    @Inject(IDeviceRepositoryToken) private readonly deviceRepository: IDeviceRepository,
    @Inject(IHeartbeatRepositoryToken) private readonly heartbeatRepository: IHeartbeatRepository,
    @Inject(IDeviceAuthenticatorToken) private readonly authenticator: IDeviceAuthenticator,
    private readonly heartbeatPresence: HeartbeatPresenceService,
    private readonly timelineService: DeviceTimelineService,
    @Inject(forwardRef(() => RegistrationKeyService)) private readonly registrationKeyService: RegistrationKeyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getUnassignedDevices(organizationId: string): Promise<SharedDevice[]> {
    const allDevices = await this.deviceRepository.findAll(organizationId);
    const devices = allDevices.filter(d => d.claimStatus === 'UNASSIGNED');
    return devices.map(d => this.sanitizeDevice(d));
  }

  async claimDevice(deviceId: string, organizationId: string, claimedByUserId: string, teamId?: string, departmentId?: string): Promise<SharedDevice> {
    const device = await this.deviceRepository.findById(deviceId);
    if (!device || device.organizationId !== organizationId) {
      throw new NotFoundException('Device not found or not in this organization');
    }
    
    const updatedDevice = await this.deviceRepository.update(deviceId, {
      claimStatus: 'CLAIMED' as any,
    });

    // Emit domain event — timeline and realtime handlers subscribe independently
    this.eventEmitter.emit(
      'device.claimed',
      new DeviceClaimedEvent(organizationId, device.id, claimedByUserId, teamId, departmentId),
    );

    return this.sanitizeDevice(updatedDevice);
  }

  async register(dto: RegisterDeviceDto, ipAddress?: string): Promise<RegisterDeviceResponse> {
    this.logger.log(`Registering monitoring agent UUID [${dto.uuid}] Hostname [${dto.hostname}] (${dto.os})`);

    let organizationId: string | undefined = dto.organizationId;

    if (dto.registrationKey) {
      const regKey = await this.registrationKeyService.validateKey(dto.registrationKey);
      organizationId = regKey.organizationId;
      // Increment the key usage asynchronously
      this.registrationKeyService.incrementKeyUsage(regKey.id, ipAddress).catch(err => {
        this.logger.error(`Failed to increment registration key usage: ${err.message}`, err.stack);
      });
    }

    const credentials = await this.authenticator.generateCredentials(dto.uuid);
    const existing = await this.deviceRepository.findByUuid(dto.uuid);
    let device: Device;
    const isNew = !existing;

    if (existing) {
      this.logger.log(`Agent UUID [${dto.uuid}] recognized. Refreshing cryptographic token and metadata.`);
      device = await this.deviceRepository.update(existing.id, {
        hostname: dto.hostname,
        deviceName: dto.deviceName,
        os: dto.os,
        osVersion: dto.osVersion,
        architecture: dto.architecture,
        agentVersion: dto.agentVersion,
        status: DeviceStatus.ONLINE,
        lastSeen: new Date(),
        tokenHash: credentials.tokenHash,
        organizationId: organizationId || existing.organizationId,
      });
    } else {
      if (!organizationId) {
        throw new Error('A valid registration key is required for initial device registration.');
      }
      device = await this.deviceRepository.create({
        uuid: dto.uuid,
        hostname: dto.hostname,
        deviceName: dto.deviceName,
        os: dto.os,
        osVersion: dto.osVersion,
        architecture: dto.architecture,
        agentVersion: dto.agentVersion,
        status: DeviceStatus.ONLINE,
        organizationId: organizationId,
        tokenHash: credentials.tokenHash,
        lastSeen: new Date(),
      });
    }

    const sanitized = this.sanitizeDevice(device);

    // Emit domain events — timeline and realtime handlers subscribe independently
    if (isNew) {
      this.eventEmitter.emit(
        'device.registered',
        new DeviceRegisteredEvent(
          device.organizationId || 'default-org',
          device.id,
          dto.hostname,
          dto.os,
          dto.osVersion,
          dto.architecture,
          dto.agentVersion,
        ),
      );
    } else {
      this.eventEmitter.emit(
        'device.reconnected',
        new DeviceReconnectedEvent(
          device.organizationId || 'default-org',
          device.id,
          dto.hostname,
        ),
      );
    }

    return {
      deviceId: device.id,
      registrationToken: credentials.rawToken,
      device: sanitized,
    };
  }

  async recordHeartbeat(device: Device, dto: HeartbeatDto): Promise<HeartbeatResponse> {
    this.logger.debug(`Heartbeat ingested from Agent [${device.hostname}] (${dto.ipAddress}): CPU ${dto.cpuUsage}%, RAM ${dto.ramUsage}%`);

    const wasOffline = device.status === DeviceStatus.OFFLINE;

    const updatedDevice = await this.deviceRepository.update(device.id, {
      status: DeviceStatus.ONLINE,
      lastSeen: new Date(),
      ...(dto.hostname && { hostname: dto.hostname }),
      ...(dto.os && { os: dto.os }),
    });

    const timestampDate = !isNaN(Date.parse(dto.timestamp)) ? new Date(dto.timestamp) : new Date();
    const heartbeat = await this.heartbeatRepository.create({
      deviceId: device.id,
      cpuUsage: dto.cpuUsage,
      ramUsage: dto.ramUsage,
      uptime: dto.uptime,
      ipAddress: dto.ipAddress,
      timestamp: timestampDate,
    });

    await this.heartbeatPresence.processHeartbeat(
      device.id,
      dto.ipAddress,
      dto.cpuUsage,
      dto.ramUsage,
      dto.uptime,
    );

    // Emit domain event — timeline and realtime handlers subscribe independently
    this.eventEmitter.emit(
      'heartbeat.received',
      new HeartbeatReceivedEvent(
        device.organizationId || 'default-org',
        device.id,
        dto.ipAddress,
        dto.cpuUsage,
        dto.ramUsage,
        dto.uptime,
        wasOffline,
      ),
    );

    return {
      success: true,
      status: updatedDevice.status as unknown as any,
      lastSeen: (updatedDevice.lastSeen || new Date()).toISOString(),
      heartbeatId: heartbeat.id,
    };
  }

  async getDeviceProfile(device: Device): Promise<SharedDevice & { lastHeartbeat?: SharedHeartbeat | null }> {
    const latestHeartbeat = await this.heartbeatRepository.findLatestByDeviceId(device.id);
    return {
      ...this.sanitizeDevice(device),
      lastHeartbeat: latestHeartbeat ? this.sanitizeHeartbeat(latestHeartbeat) : null,
    };
  }

  async getPlatformStatus(): Promise<DeviceStatusResponse> {
    const devices = await this.deviceRepository.findAll();
    const now = new Date().getTime();

    let totalOnline = 0;
    let totalOffline = 0;
    let totalDegraded = 0;

    const deviceResults: (SharedDevice & { lastHeartbeat?: SharedHeartbeat | null })[] = [];

    for (const d of devices) {
      let currentStatus = d.status;
      const lastSeenMs = d.lastSeen ? d.lastSeen.getTime() : 0;
      const isStale = (now - lastSeenMs) > this.STALE_HEARTBEAT_THRESHOLD_MS;

      // Automatically evaluate stale heartbeats to maintain accurate operational status
      if (currentStatus === DeviceStatus.ONLINE && isStale) {
        await this.deviceRepository.update(d.id, { status: DeviceStatus.OFFLINE });
        currentStatus = DeviceStatus.OFFLINE;

        // Emit domain event for offline transition — timeline and realtime handlers subscribe
        this.eventEmitter.emit(
          'device.offline',
          new DeviceOfflineEvent(
            d.organizationId || 'default-org',
            d.id,
            '3 consecutive missed heartbeat windows (stale sweep)',
          ),
        );
      }

      if (currentStatus === DeviceStatus.ONLINE) totalOnline++;
      else if (currentStatus === DeviceStatus.DEGRADED) totalDegraded++;
      else totalOffline++;

      const latestHeartbeat = await this.heartbeatRepository.findLatestByDeviceId(d.id);
      deviceResults.push({
        ...this.sanitizeDevice({ ...d, status: currentStatus }),
        lastHeartbeat: latestHeartbeat ? this.sanitizeHeartbeat(latestHeartbeat) : null,
      });
    }

    return {
      devices: deviceResults,
      summary: {
        totalRegistered: devices.length,
        totalOnline,
        totalOffline,
        totalDegraded,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getDeviceById(id: string): Promise<SharedDevice & { lastHeartbeat?: SharedHeartbeat | null }> {
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundException(`Monitored agent node with primary UUID [${id}] not found in platform inventory.`);
    }
    const latestHeartbeat = await this.heartbeatRepository.findLatestByDeviceId(device.id);
    return {
      ...this.sanitizeDevice(device),
      lastHeartbeat: latestHeartbeat ? this.sanitizeHeartbeat(latestHeartbeat) : null,
    };
  }

  // ── Step 3 Device Lifecycle Management Methods ─────────────────────────

  async setMaintenanceMode(deviceId: string, enabled: boolean, actorId?: string, actorName?: string): Promise<SharedDevice> {
    const device = await this.deviceRepository.findById(deviceId);
    if (!device) throw new NotFoundException(`Device [${deviceId}] not found.`);

    const newStatus = enabled ? DeviceStatus.MAINTENANCE : DeviceStatus.ONLINE;
    const updated = await this.deviceRepository.update(deviceId, { status: newStatus });

    // Emit domain event — timeline and realtime handlers subscribe independently
    this.eventEmitter.emit(
      'device.maintenance',
      new DeviceMaintenanceEvent(
        device.organizationId || 'default-org',
        deviceId,
        enabled,
        actorId,
        actorName,
      ),
    );

    return this.sanitizeDevice(updated);
  }

  async retireDevice(deviceId: string, actorId?: string, actorName?: string): Promise<SharedDevice> {
    const device = await this.deviceRepository.findById(deviceId);
    if (!device) throw new NotFoundException(`Device [${deviceId}] not found.`);

    const updated = await this.deviceRepository.update(deviceId, { status: DeviceStatus.OFFLINE });

    // Emit domain event — timeline and realtime handlers subscribe independently
    this.eventEmitter.emit(
      'device.retired',
      new DeviceRetiredEvent(
        device.organizationId || 'default-org',
        deviceId,
        actorId,
        actorName,
      ),
    );

    return this.sanitizeDevice(updated);
  }

  async bulkUpdateStatus(deviceIds: string[], status: DeviceStatus, actorId?: string, actorName?: string): Promise<{ updatedCount: number }> {
    let count = 0;
    for (const id of deviceIds) {
      try {
        const device = await this.deviceRepository.findById(id);
        await this.deviceRepository.update(id, { status });
        count++;

        // Emit domain event per device — timeline and realtime handlers subscribe independently
        this.eventEmitter.emit(
          'device.bulk_status',
          new DeviceBulkStatusEvent(
            device?.organizationId || 'default-org',
            id,
            status,
            actorId,
            actorName,
          ),
        );
      } catch (e: any) {
        this.logger.warn(`Failed to bulk update status for device ${id}: ${e?.message}`);
      }
    }
    return { updatedCount: count };
  }

  async getDeviceTimeline(deviceId: string, page = 1, limit = 20) {
    const device = await this.deviceRepository.findById(deviceId);
    if (!device) throw new NotFoundException(`Device [${deviceId}] not found.`);
    return this.timelineService.getPaginatedTimeline({ deviceId, page, limit });
  }

  private sanitizeDevice(device: Device): SharedDevice {
    return {
      id: device.id,
      uuid: device.uuid,
      hostname: device.hostname,
      deviceName: device.deviceName,
      os: device.os,
      osVersion: device.osVersion,
      architecture: device.architecture,
      agentVersion: device.agentVersion,
      status: device.status as unknown as any,
      lastSeen: device.lastSeen ? device.lastSeen.toISOString() : null,
      registeredAt: device.registeredAt.toISOString(),
      organizationId: device.organizationId,
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
    };
  }

  private sanitizeHeartbeat(hb: any): SharedHeartbeat {
    return {
      id: hb.id,
      deviceId: hb.deviceId,
      cpuUsage: hb.cpuUsage,
      ramUsage: hb.ramUsage,
      uptime: hb.uptime,
      ipAddress: hb.ipAddress,
      timestamp: hb.timestamp instanceof Date ? hb.timestamp.toISOString() : String(hb.timestamp),
    };
  }
}
