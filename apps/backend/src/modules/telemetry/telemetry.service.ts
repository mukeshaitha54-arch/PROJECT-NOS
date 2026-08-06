import { Inject, Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Device as PrismaDevice, TelemetryAggregation } from '@prisma/client';
import {
  ITelemetryRepository,
  ITelemetryRepositoryToken,
} from '../../common/repositories/telemetry.repository.interface';
import {
  ITelemetryPublisher,
  ITelemetryPublisherToken,
} from '../../common/services/telemetry-publisher.interface';
import { SubmitTelemetryDto, TelemetryHistoryQueryDto, toTelemetrySnapshotDto } from './dto/telemetry.dto';
import { TelemetrySnapshot as TelemetrySnapshotContract, PaginatedTelemetryResponse } from '@nos/shared-types';
import { TelemetryReceivedEvent } from '../../common/events/domain-events';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(
    @Inject(ITelemetryRepositoryToken)
    private readonly telemetryRepo: ITelemetryRepository,
    @Inject(ITelemetryPublisherToken)
    private readonly publisher: ITelemetryPublisher,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  async recordTelemetry(authenticatedDevice: PrismaDevice, dto: SubmitTelemetryDto): Promise<TelemetrySnapshotContract> {
    const targetDeviceId = dto.deviceId || authenticatedDevice.id;
    if (targetDeviceId !== authenticatedDevice.id) {
      throw new BadRequestException('Security violation: Cannot submit telemetry metrics on behalf of a differing device UUID.');
    }

    let bootTimeDate: Date;
    try {
      bootTimeDate = new Date(dto.bootTime);
      if (isNaN(bootTimeDate.getTime())) bootTimeDate = new Date();
    } catch {
      bootTimeDate = new Date();
    }

    let timestampDate: Date | undefined;
    if (dto.timestamp) {
      const parsed = new Date(dto.timestamp);
      if (!isNaN(parsed.getTime())) timestampDate = parsed;
    }

    // Persist raw telemetry values behind repository abstraction in UTC
    const entity = await this.telemetryRepo.create({
      deviceId: targetDeviceId,
      cpuUsage: dto.cpuUsage,
      cpuTemperature: dto.cpuTemperature,
      cpuFrequency: dto.cpuFrequency,
      logicalProcessors: dto.logicalProcessors,
      physicalProcessors: dto.physicalProcessors,
      memoryUsed: dto.memoryUsed,
      memoryFree: dto.memoryFree,
      memoryTotal: dto.memoryTotal,
      memoryUsagePercent: dto.memoryUsagePercent,
      diskReadSpeed: dto.diskReadSpeed,
      diskWriteSpeed: dto.diskWriteSpeed,
      diskUsagePercent: dto.diskUsagePercent,
      diskFree: dto.diskFree,
      diskTotal: dto.diskTotal,
      networkUploadSpeed: dto.networkUploadSpeed,
      networkDownloadSpeed: dto.networkDownloadSpeed,
      bytesSent: dto.bytesSent,
      bytesReceived: dto.bytesReceived,
      activeConnections: dto.activeConnections,
      runningProcesses: dto.runningProcesses,
      systemUptime: dto.systemUptime,
      bootTime: bootTimeDate,
      ipAddress: dto.ipAddress,
      macAddress: dto.macAddress,
      timestamp: timestampDate || new Date(),
    });

    const dtoResult = toTelemetrySnapshotDto(entity);

    // Publish via stream publisher abstraction (retained for backward compatibility)
    await this.publisher.publish(dtoResult);

    // Emit domain event — realtime handler subscribes and broadcasts via Socket.IO
    this.eventEmitter.emit(
      'telemetry.received',
      new TelemetryReceivedEvent(
        authenticatedDevice.organizationId || 'default-org',
        targetDeviceId,
        dtoResult,
      ),
    );

    return dtoResult;
  }

  async getLatestTelemetry(deviceId: string): Promise<TelemetrySnapshotContract> {
    const entity = await this.telemetryRepo.findLatest(deviceId);
    if (!entity) {
      throw new NotFoundException(`No telemetry snapshots recorded yet for device ID [${deviceId}].`);
    }
    return toTelemetrySnapshotDto(entity);
  }

  /**
   * Retrieves the most recent aggregated telemetry row for a device at a specific time granularity.
   */
  async getLatestAggregated(deviceId: string, granularity: '1m' | '15m' | '1h' | '1d'): Promise<TelemetryAggregation> {
    const entity = await this.prisma.telemetryAggregation.findFirst({
      where: {
        deviceId,
        OR: [{ granularity }, { tier: granularity }],
      },
      orderBy: { periodStart: 'desc' },
    });

    if (!entity) {
      throw new NotFoundException(`No telemetry aggregations recorded for device [${deviceId}] at granularity [${granularity}].`);
    }

    return entity;
  }

  /**
   * Smart dashboard query service: automatically switches between high-velocity raw snapshots
   * and rollup aggregations based on requested date range duration to prevent table scan bloat.
   */
  async getHistory(
    deviceId: string,
    startDate?: Date | string,
    endDate?: Date | string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedTelemetryResponse> {
    const pageNum = page > 0 ? page : 1;
    const limitNum = limit > 0 ? limit : 50;
    const skip = (pageNum - 1) * limitNum;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    const durationMs = Math.abs(end.getTime() - start.getTime());
    const oneHourMs = 60 * 60 * 1000;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    // 1. If range <= 1 hour: query TelemetrySnapshot (raw) directly
    if (durationMs <= oneHourMs) {
      this.logger.debug(`Range <= 1h (${Math.round(durationMs / 60000)}m). Querying raw TelemetrySnapshot table.`);
      const { items, total } = await this.telemetryRepo.findRange({
        deviceId,
        from: start,
        to: end,
        skip,
        take: limitNum,
      });
      const snapshots = items.map(toTelemetrySnapshotDto);
      const totalPages = Math.ceil(total / limitNum) || 1;
      return { snapshots, total, page: pageNum, limit: limitNum, totalPages };
    }

    // 2. Determine aggregation tier/granularity based on duration
    let targetGranularities: string[];
    if (durationMs <= oneDayMs) {
      // Range <= 24 hours: query 1m or 15m aggregates
      targetGranularities = ['1m', '15m'];
    } else if (durationMs <= sevenDaysMs) {
      // Range <= 7 days: query 15m or 1h aggregates
      targetGranularities = ['15m', '1h'];
    } else {
      // Range > 7 days: query 1d aggregates
      targetGranularities = ['1d'];
    }

    this.logger.debug(`Range > 1h. Querying TelemetryAggregation table for tiers [${targetGranularities.join(', ')}].`);

    const where = {
      deviceId,
      OR: [
        { granularity: { in: targetGranularities } },
        { tier: { in: targetGranularities } },
      ],
      periodStart: {
        gte: start,
        lte: end,
      },
    };

    const [aggItems, total] = await Promise.all([
      this.prisma.telemetryAggregation.findMany({
        where,
        orderBy: { periodStart: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.telemetryAggregation.count({ where }),
    ]);

    const snapshots = aggItems.map((agg) => mapAggregationToSnapshotContract(agg));
    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      snapshots,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    };
  }

  async getTelemetryHistory(deviceId: string, query: TelemetryHistoryQueryDto): Promise<PaginatedTelemetryResponse> {
    return this.getHistory(deviceId, query.from, query.to, query.page, query.limit);
  }
}

function mapAggregationToSnapshotContract(agg: TelemetryAggregation): TelemetrySnapshotContract {
  return {
    id: agg.id,
    deviceId: agg.deviceId,
    cpuUsage: agg.avgCpu,
    cpuTemperature: 0,
    cpuFrequency: 0,
    logicalProcessors: 1,
    physicalProcessors: 1,
    memoryUsed: 0,
    memoryFree: 0,
    memoryTotal: 16 * 1024 * 1024 * 1024,
    memoryUsagePercent: agg.avgRam,
    diskReadSpeed: 0,
    diskWriteSpeed: 0,
    diskUsagePercent: agg.avgDisk,
    diskFree: 0,
    diskTotal: 0,
    networkUploadSpeed: agg.avgNetwork / 2,
    networkDownloadSpeed: agg.avgNetwork / 2,
    bytesSent: 0,
    bytesReceived: 0,
    activeConnections: agg.sampleCount,
    runningProcesses: 0,
    systemUptime: 0,
    bootTime: agg.periodStart.toISOString(),
    ipAddress: 'aggregated',
    macAddress: 'aggregated',
    timestamp: agg.periodStart.toISOString(),
  };
}
