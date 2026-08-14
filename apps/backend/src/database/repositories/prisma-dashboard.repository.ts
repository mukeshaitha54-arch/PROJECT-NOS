import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
  IDashboardRepository,
  DashboardOverviewCounts,
  DeviceRowRaw,
  DeviceDetailRaw,
  TelemetryHistoryRaw,
} from "../../common/repositories/dashboard.repository.interface";
import { DeviceStatus, Prisma } from "@prisma/client";

@Injectable()
export class PrismaDashboardRepository implements IDashboardRepository {
  private readonly logger = new Logger(PrismaDashboardRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOverviewCounts(
    organizationId: string,
  ): Promise<DashboardOverviewCounts> {
    const [total, statusGroups] = await Promise.all([
      this.prisma.device.count({ where: { organizationId } }),
      this.prisma.device.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: { status: true },
      }),
    ]);

    const counts: DashboardOverviewCounts = {
      total,
      online: 0,
      offline: 0,
      critical: 0,
      warning: 0,
      degraded: 0,
      maintenance: 0,
    };

    for (const group of statusGroups) {
      const cnt = group._count.status;
      switch (group.status) {
        case DeviceStatus.ONLINE:
          counts.online = cnt;
          break;
        case DeviceStatus.OFFLINE:
          counts.offline = cnt;
          break;
        case DeviceStatus.CRITICAL:
          counts.critical = cnt;
          break;
        case DeviceStatus.DEGRADED:
          counts.degraded = cnt;
          counts.warning = cnt; // Map DEGRADED directly to warning alerts in summary
          break;
        case DeviceStatus.MAINTENANCE:
          counts.maintenance = cnt;
          break;
      }
    }

    return counts;
  }

  async getDeviceRows(params: {
    organizationId: string;
    skip: number;
    take: number;
    search?: string;
    status?: string;
    os?: string;
  }): Promise<{ devices: DeviceRowRaw[]; total: number }> {
    const where: Prisma.DeviceWhereInput = {
      organizationId: params.organizationId,
    };

    if (params.search && params.search.trim().length > 0) {
      const term = params.search.trim();
      where.OR = [
        { hostname: { contains: term, mode: "insensitive" } },
        { uuid: { contains: term, mode: "insensitive" } },
        { deviceName: { contains: term, mode: "insensitive" } },
        { os: { contains: term, mode: "insensitive" } },
      ];
    }

    if (
      params.status &&
      params.status !== "ALL" &&
      params.status.trim() !== ""
    ) {
      where.status = params.status.toUpperCase() as DeviceStatus;
    }

    if (params.os && params.os !== "ALL" && params.os.trim() !== "") {
      where.os = { contains: params.os.trim(), mode: "insensitive" };
    }

    const [total, records] = await Promise.all([
      this.prisma.device.count({ where }),
      this.prisma.device.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ lastSeen: "desc" }, { hostname: "asc" }],
        select: {
          id: true,
          uuid: true,
          hostname: true,
          status: true,
          lastSeen: true,
          os: true,
          osVersion: true,
          agentVersion: true,
          telemetrySnapshots: {
            orderBy: { timestamp: "desc" },
            take: 1,
            select: {
              cpuUsage: true,
              memoryUsagePercent: true,
              diskUsagePercent: true,
              networkUploadSpeed: true,
              networkDownloadSpeed: true,
              ipAddress: true,
              activeConnections: true,
            },
          },
          heartbeats: {
            orderBy: { timestamp: "desc" },
            take: 1,
            select: {
              cpuUsage: true,
              ramUsage: true,
              ipAddress: true,
              uptime: true,
            },
          },
        },
      }),
    ]);

    const devices: DeviceRowRaw[] = records.map((r) => ({
      id: r.id,
      uuid: r.uuid,
      hostname: r.hostname,
      status: r.status,
      lastSeen: r.lastSeen,
      os: r.os,
      osVersion: r.osVersion,
      agentVersion: r.agentVersion,
      latestSnapshot: r.telemetrySnapshots[0] || null,
      latestHeartbeat: r.heartbeats[0] || null,
    }));

    return { devices, total };
  }

  async getDeviceDetail(
    organizationId: string,
    deviceId: string,
  ): Promise<DeviceDetailRaw | null> {
    const device = await this.prisma.device.findFirst({
      where: {
        organizationId,
        OR: [{ id: deviceId }, { uuid: deviceId }],
      },
      include: {
        telemetrySnapshots: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
        heartbeats: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
    });

    if (!device) return null;

    const currentSnapshot = device.telemetrySnapshots[0] || null;
    const latestHeartbeat = device.heartbeats[0] || null;

    // Remove relations from base device object before returning raw
    const cleanDevice: Partial<typeof device> = { ...device };
    delete cleanDevice.telemetrySnapshots;
    delete cleanDevice.heartbeats;

    return {
      device: cleanDevice,
      currentSnapshot,
      latestHeartbeat,
    };
  }

  async getTelemetryHistory(
    organizationId: string,
    deviceId: string,
    params: {
      from?: Date;
      to?: Date;
      skip: number;
      take: number;
    },
  ): Promise<TelemetryHistoryRaw> {
    const where: Prisma.TelemetrySnapshotWhereInput = {
      device: {
        organizationId,
      },
      OR: [{ deviceId: deviceId }, { device: { uuid: deviceId } }],
    };

    if (params.from || params.to) {
      where.timestamp = {};
      if (params.from) where.timestamp.gte = params.from;
      if (params.to) where.timestamp.lte = params.to;
    }

    const [total, snapshots] = await Promise.all([
      this.prisma.telemetrySnapshot.count({ where }),
      this.prisma.telemetrySnapshot.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { timestamp: "desc" },
      }),
    ]);

    return { snapshots, total };
  }
}
