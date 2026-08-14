import { Injectable } from "@nestjs/common";
import {
  TelemetrySnapshot as PrismaTelemetrySnapshot,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma.service";
import {
  ITelemetryRepository,
  TelemetryCreateInput,
  TelemetryRangeQuery,
  TelemetryAggregationResult,
} from "../../common/repositories/telemetry.repository.interface";

@Injectable()
export class PrismaTelemetryRepository implements ITelemetryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: TelemetryCreateInput): Promise<PrismaTelemetrySnapshot> {
    return this.prisma.telemetrySnapshot.create({
      data: {
        deviceId: data.deviceId,
        cpuUsage: data.cpuUsage,
        cpuTemperature: data.cpuTemperature,
        cpuFrequency: data.cpuFrequency,
        logicalProcessors: data.logicalProcessors,
        physicalProcessors: data.physicalProcessors,
        memoryUsed: data.memoryUsed,
        memoryFree: data.memoryFree,
        memoryTotal: data.memoryTotal,
        memoryUsagePercent: data.memoryUsagePercent,
        diskReadSpeed: data.diskReadSpeed,
        diskWriteSpeed: data.diskWriteSpeed,
        diskUsagePercent: data.diskUsagePercent,
        diskFree: data.diskFree,
        diskTotal: data.diskTotal,
        networkUploadSpeed: data.networkUploadSpeed,
        networkDownloadSpeed: data.networkDownloadSpeed,
        bytesSent: data.bytesSent,
        bytesReceived: data.bytesReceived,
        activeConnections: data.activeConnections,
        runningProcesses: data.runningProcesses,
        systemUptime: data.systemUptime,
        bootTime: data.bootTime,
        ipAddress: data.ipAddress,
        macAddress: data.macAddress,
        timestamp: data.timestamp || new Date(),
      },
    });
  }

  async findLatest(deviceId: string): Promise<PrismaTelemetrySnapshot | null> {
    return this.prisma.telemetrySnapshot.findFirst({
      where: { deviceId },
      orderBy: { timestamp: "desc" },
    });
  }

  async findRange(
    query: TelemetryRangeQuery,
  ): Promise<{ items: PrismaTelemetrySnapshot[]; total: number }> {
    const where: Prisma.TelemetrySnapshotWhereInput = {
      deviceId: query.deviceId,
    };
    if (query.from || query.to) {
      where.timestamp = {};
      if (query.from) where.timestamp.gte = query.from;
      if (query.to) where.timestamp.lte = query.to;
    }

    const [items, total] = await Promise.all([
      this.prisma.telemetrySnapshot.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip: query.skip || 0,
        take: query.take || 50,
      }),
      this.prisma.telemetrySnapshot.count({ where }),
    ]);

    return { items, total };
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.telemetrySnapshot.count({ where: { id } });
    return count > 0;
  }

  async deleteOlderThan(cutoffDate: Date): Promise<number> {
    const result = await this.prisma.telemetrySnapshot.deleteMany({
      where: { timestamp: { lt: cutoffDate } },
    });
    return result.count;
  }

  async aggregate(
    deviceId: string,
    from?: Date,
    to?: Date,
  ): Promise<TelemetryAggregationResult> {
    const where: Prisma.TelemetrySnapshotWhereInput = { deviceId };
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = from;
      if (to) where.timestamp.lte = to;
    }

    const agg = await this.prisma.telemetrySnapshot.aggregate({
      where,
      _avg: {
        cpuUsage: true,
        memoryUsagePercent: true,
        diskUsagePercent: true,
      },
      _count: { id: true },
    });

    return {
      deviceId,
      avgCpuUsage: agg._avg.cpuUsage || 0,
      avgMemoryUsage: agg._avg.memoryUsagePercent || 0,
      avgDiskUsage: agg._avg.diskUsagePercent || 0,
      sampleCount: agg._count.id,
    };
  }
}
