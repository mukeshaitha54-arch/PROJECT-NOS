import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { Device, DeviceStatus } from '@prisma/client';
import { RegisterDeviceDto, HeartbeatDto } from './dto/device.dto';
import { IDeviceRepositoryToken, IDeviceRepository } from '../../common/repositories/device.repository.interface';
import { IHeartbeatRepositoryToken, IHeartbeatRepository } from '../../common/repositories/heartbeat.repository.interface';
import { IDeviceAuthenticatorToken, IDeviceAuthenticator } from '../../common/services/device-authenticator.interface';
import { ISocketPublisherToken, ISocketPublisher } from '../../common/services/socket-publisher.interface';
import { HeartbeatPresenceService } from '../realtime/services/heartbeat-presence.service';
import { RegisterDeviceResponse, HeartbeatResponse, DeviceStatusResponse, Device as SharedDevice, Heartbeat as SharedHeartbeat } from '@nos/shared-types';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);
  private readonly STALE_HEARTBEAT_THRESHOLD_MS = 90 * 1000; // 90 seconds (3 missed 30s poll cycles)

  constructor(
    @Inject(IDeviceRepositoryToken) private readonly deviceRepository: IDeviceRepository,
    @Inject(IHeartbeatRepositoryToken) private readonly heartbeatRepository: IHeartbeatRepository,
    @Inject(IDeviceAuthenticatorToken) private readonly authenticator: IDeviceAuthenticator,
    @Inject(ISocketPublisherToken) private readonly socketPublisher: ISocketPublisher,
    private readonly heartbeatPresence: HeartbeatPresenceService,
  ) {}

  async register(dto: RegisterDeviceDto): Promise<RegisterDeviceResponse> {
    this.logger.log(`Registering monitoring agent UUID [${dto.uuid}] Hostname [${dto.hostname}] (${dto.os})`);

    const credentials = await this.authenticator.generateCredentials(dto.uuid);
    const existing = await this.deviceRepository.findByUuid(dto.uuid);
    let device: Device;

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
      });
    } else {
      device = await this.deviceRepository.create({
        uuid: dto.uuid,
        hostname: dto.hostname,
        deviceName: dto.deviceName,
        os: dto.os,
        osVersion: dto.osVersion,
        architecture: dto.architecture,
        agentVersion: dto.agentVersion,
        status: DeviceStatus.ONLINE,
        organizationId: dto.organizationId,
        tokenHash: credentials.tokenHash,
        lastSeen: new Date(),
      });
    }

    const sanitized = this.sanitizeDevice(device);
    await this.socketPublisher.emitDeviceConnected(device.id, sanitized);
    await this.socketPublisher.emitDeviceOnline(device.id, { deviceId: device.id, status: 'ONLINE', timestamp: new Date().toISOString() });

    return {
      deviceId: device.id,
      registrationToken: credentials.rawToken,
      device: sanitized,
    };
  }

  async recordHeartbeat(device: Device, dto: HeartbeatDto): Promise<HeartbeatResponse> {
    this.logger.debug(`Heartbeat ingested from Agent [${device.hostname}] (${dto.ipAddress}): CPU ${dto.cpuUsage}%, RAM ${dto.ramUsage}%`);

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
        await this.socketPublisher.emitDeviceOffline(d.id, { deviceId: d.id, reason: 'STALE_POLLING_SWEEP', timestamp: new Date().toISOString() });
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
