import { Injectable, Inject, NotFoundException, Logger } from "@nestjs/common";
import {
  IDashboardRepository,
  DashboardOverviewCounts,
} from "../../common/repositories/dashboard.repository.interface";
import {
  ISocketPublisherToken,
  ISocketPublisher,
} from "../../common/services/socket-publisher.interface";
import {
  DashboardDevicesQueryDto,
  DashboardHistoryQueryDto,
} from "./dto/dashboard.dto";
import {
  DashboardOverviewResponse,
  PaginatedDashboardDevicesResponse,
  DashboardDeviceRow,
  DashboardDeviceDetailResponse,
  PaginatedTelemetryResponse,
  TelemetrySnapshot,
  DeviceStatus,
} from "@nos/shared-types";

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject(IDashboardRepository)
    private readonly repository: IDashboardRepository,
    @Inject(ISocketPublisherToken)
    private readonly socketPublisher: ISocketPublisher,
  ) {}

  async publishOverviewRefresh(organizationId: string): Promise<void> {
    const overview = await this.getOverview(organizationId);
    await this.socketPublisher.emitDashboardUpdated({
      overview,
      timestamp: new Date().toISOString(),
    });
  }

  async getOverview(
    organizationId: string,
  ): Promise<DashboardOverviewResponse> {
    const counts: DashboardOverviewCounts =
      await this.repository.getOverviewCounts(organizationId);

    return {
      totalDevices: counts.total,
      online: counts.online,
      offline: counts.offline,
      critical: counts.critical,
      warning: counts.warning,
      degraded: counts.degraded,
      maintenance: counts.maintenance,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getDevices(
    organizationId: string,
    query: DashboardDevicesQueryDto,
  ): Promise<PaginatedDashboardDevicesResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const { devices, total } = await this.repository.getDeviceRows({
      organizationId,
      skip,
      take: limit,
      search: query.search,
      status: query.status,
      os: query.os,
    });

    const rows: DashboardDeviceRow[] = devices.map((d) => {
      let cpu = 0;
      let ram = 0;
      let disk = 0;
      let uploadSpeed = 0;
      let downloadSpeed = 0;
      let ipAddress = "0.0.0.0";
      let activeConnections = 0;

      if (d.latestSnapshot) {
        cpu = Math.round(d.latestSnapshot.cpuUsage * 10) / 10;
        ram = Math.round(d.latestSnapshot.memoryUsagePercent * 10) / 10;
        disk = Math.round(d.latestSnapshot.diskUsagePercent * 10) / 10;
        uploadSpeed = Math.round(d.latestSnapshot.networkUploadSpeed || 0);
        downloadSpeed = Math.round(d.latestSnapshot.networkDownloadSpeed || 0);
        ipAddress = d.latestSnapshot.ipAddress || "0.0.0.0";
        activeConnections = d.latestSnapshot.activeConnections || 0;
      } else if (d.latestHeartbeat) {
        cpu = Math.round(d.latestHeartbeat.cpuUsage * 10) / 10;
        ram = Math.round(d.latestHeartbeat.ramUsage * 10) / 10;
        ipAddress = d.latestHeartbeat.ipAddress || "0.0.0.0";
      }

      return {
        id: d.id,
        uuid: d.uuid,
        hostname: d.hostname,
        status: d.status as DeviceStatus,
        cpu,
        ram,
        disk,
        network: {
          uploadSpeed,
          downloadSpeed,
          ipAddress,
          activeConnections,
        },
        lastSeen: d.lastSeen ? d.lastSeen.toISOString() : null,
        os: d.os,
        osVersion: d.osVersion,
        agentVersion: d.agentVersion,
      };
    });

    return {
      devices: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getDeviceById(
    organizationId: string,
    id: string,
  ): Promise<DashboardDeviceDetailResponse> {
    const raw = await this.repository.getDeviceDetail(organizationId, id);
    if (!raw || !raw.device) {
      throw new NotFoundException(
        `Monitored device with identifier [${id}] not found in control plane.`,
      );
    }

    const { device, currentSnapshot, latestHeartbeat } = raw;

    const currentCpu = currentSnapshot
      ? Math.round(currentSnapshot.cpuUsage * 10) / 10
      : latestHeartbeat
        ? Math.round(latestHeartbeat.cpuUsage * 10) / 10
        : 0;
    const currentRam = currentSnapshot
      ? Math.round(currentSnapshot.memoryUsagePercent * 10) / 10
      : latestHeartbeat
        ? Math.round(latestHeartbeat.ramUsage * 10) / 10
        : 0;
    const currentDisk = currentSnapshot
      ? Math.round(currentSnapshot.diskUsagePercent * 10) / 10
      : 0;

    const currentNetwork = {
      uploadSpeed: currentSnapshot
        ? Math.round(currentSnapshot.networkUploadSpeed || 0)
        : 0,
      downloadSpeed: currentSnapshot
        ? Math.round(currentSnapshot.networkDownloadSpeed || 0)
        : 0,
      bytesSent: currentSnapshot ? currentSnapshot.bytesSent : 0,
      bytesReceived: currentSnapshot ? currentSnapshot.bytesReceived : 0,
      activeConnections: currentSnapshot
        ? currentSnapshot.activeConnections || 0
        : 0,
      ipAddress: currentSnapshot
        ? currentSnapshot.ipAddress
        : latestHeartbeat
          ? latestHeartbeat.ipAddress
          : "0.0.0.0",
      macAddress: currentSnapshot
        ? currentSnapshot.macAddress
        : "00:00:00:00:00:00",
    };

    const uptime = currentSnapshot
      ? currentSnapshot.systemUptime
      : latestHeartbeat
        ? latestHeartbeat.uptime
        : 0;
    const deviceStatus = device.status as DeviceStatus;

    let systemStatus = "HEALTHY";
    if (deviceStatus === DeviceStatus.CRITICAL) {
      systemStatus = "CRITICAL";
    } else if (
      deviceStatus === DeviceStatus.DEGRADED ||
      currentCpu > 85 ||
      currentRam > 88 ||
      currentDisk > 92
    ) {
      systemStatus = "WARNING";
    } else if (deviceStatus === DeviceStatus.OFFLINE) {
      systemStatus = "OFFLINE";
    } else if (deviceStatus === DeviceStatus.MAINTENANCE) {
      systemStatus = "MAINTENANCE";
    }

    const cleanedDevice = {
      ...device,
      lastSeen: device.lastSeen ? device.lastSeen.toISOString() : null,
      registeredAt: device.registeredAt
        ? device.registeredAt.toISOString()
        : new Date(0).toISOString(),
      createdAt: device.createdAt
        ? device.createdAt.toISOString()
        : new Date(0).toISOString(),
      updatedAt: device.updatedAt
        ? device.updatedAt.toISOString()
        : new Date(0).toISOString(),
      tokenHash: undefined, // scrub internal auth hashes
    };

    return {
      device: cleanedDevice,
      currentSnapshot: currentSnapshot
        ? this.toTelemetrySnapshotDto(currentSnapshot)
        : null,
      latestHeartbeat: latestHeartbeat
        ? {
            id: latestHeartbeat.id,
            deviceId: latestHeartbeat.deviceId,
            cpuUsage: latestHeartbeat.cpuUsage,
            ramUsage: latestHeartbeat.ramUsage,
            uptime: latestHeartbeat.uptime,
            ipAddress: latestHeartbeat.ipAddress,
            timestamp:
              latestHeartbeat.timestamp instanceof Date
                ? latestHeartbeat.timestamp.toISOString()
                : String(latestHeartbeat.timestamp),
          }
        : null,
      currentCpu,
      currentRam,
      currentDisk,
      currentNetwork,
      deviceStatus,
      uptime,
      systemStatus,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getDeviceHistory(
    organizationId: string,
    deviceId: string,
    query: DashboardHistoryQueryDto,
  ): Promise<PaginatedTelemetryResponse> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const fromDate = query.from ? new Date(query.from) : undefined;
    const toDate = query.to ? new Date(query.to) : undefined;

    const { snapshots, total } = await this.repository.getTelemetryHistory(
      organizationId,
      deviceId,
      {
        from: fromDate,
        to: toDate,
        skip,
        take: limit,
      },
    );

    const dtos: TelemetrySnapshot[] = snapshots.map((s) =>
      this.toTelemetrySnapshotDto(s),
    );

    return {
      snapshots: dtos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  private toTelemetrySnapshotDto(record: any): TelemetrySnapshot {
    return {
      id: record.id,
      deviceId: record.deviceId,
      cpuUsage: Number(record.cpuUsage),
      cpuTemperature: Number(record.cpuTemperature || 0),
      cpuFrequency: Number(record.cpuFrequency || 0),
      logicalProcessors: Number(record.logicalProcessors || 1),
      physicalProcessors: Number(record.physicalProcessors || 1),
      memoryUsed: Number(record.memoryUsed),
      memoryFree: Number(record.memoryFree),
      memoryTotal: Number(record.memoryTotal),
      memoryUsagePercent: Number(record.memoryUsagePercent),
      diskReadSpeed: Number(record.diskReadSpeed || 0),
      diskWriteSpeed: Number(record.diskWriteSpeed || 0),
      diskUsagePercent: Number(record.diskUsagePercent),
      diskFree: Number(record.diskFree),
      diskTotal: Number(record.diskTotal),
      networkUploadSpeed: Number(record.networkUploadSpeed || 0),
      networkDownloadSpeed: Number(record.networkDownloadSpeed || 0),
      bytesSent: Number(record.bytesSent || 0),
      bytesReceived: Number(record.bytesReceived || 0),
      activeConnections: Number(record.activeConnections || 0),
      runningProcesses: Number(record.runningProcesses || 0),
      systemUptime: Number(record.systemUptime),
      bootTime:
        record.bootTime instanceof Date
          ? record.bootTime.toISOString()
          : String(record.bootTime),
      ipAddress: record.ipAddress,
      macAddress: record.macAddress || "00:00:00:00:00:00",
      timestamp:
        record.timestamp instanceof Date
          ? record.timestamp.toISOString()
          : String(record.timestamp),
    };
  }
}
