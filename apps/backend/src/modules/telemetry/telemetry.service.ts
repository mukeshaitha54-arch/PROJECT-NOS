import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Device as PrismaDevice } from '@prisma/client';
import {
  ITelemetryRepository,
  ITelemetryRepositoryToken,
} from '../../common/repositories/telemetry.repository.interface';
import {
  ITelemetryPublisher,
  ITelemetryPublisherToken,
} from '../../common/services/telemetry-publisher.interface';
import { ISocketPublisherToken, ISocketPublisher } from '../../common/services/socket-publisher.interface';
import { SubmitTelemetryDto, TelemetryHistoryQueryDto, toTelemetrySnapshotDto } from './dto/telemetry.dto';
import { TelemetrySnapshot as TelemetrySnapshotContract, PaginatedTelemetryResponse } from '@nos/shared-types';

@Injectable()
export class TelemetryService {
  constructor(
    @Inject(ITelemetryRepositoryToken)
    private readonly telemetryRepo: ITelemetryRepository,
    @Inject(ITelemetryPublisherToken)
    private readonly publisher: ITelemetryPublisher,
    @Inject(ISocketPublisherToken)
    private readonly socketPublisher: ISocketPublisher,
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

    // Broadcast snapshot via stream publisher abstraction & Socket.IO real-time engine
    await this.publisher.publish(dtoResult);
    await this.socketPublisher.emitTelemetryReceived(targetDeviceId, dtoResult);

    return dtoResult;
  }

  async getLatestTelemetry(deviceId: string): Promise<TelemetrySnapshotContract> {
    const entity = await this.telemetryRepo.findLatest(deviceId);
    if (!entity) {
      throw new NotFoundException(`No telemetry snapshots recorded yet for device ID [${deviceId}].`);
    }
    return toTelemetrySnapshotDto(entity);
  }

  async getTelemetryHistory(deviceId: string, query: TelemetryHistoryQueryDto): Promise<PaginatedTelemetryResponse> {
    const limit = query.limit || 50;
    const page = query.page || 1;
    const skip = (page - 1) * limit;

    let fromDate: Date | undefined;
    if (query.from) {
      const parsed = new Date(query.from);
      if (!isNaN(parsed.getTime())) fromDate = parsed;
    }

    let toDate: Date | undefined;
    if (query.to) {
      const parsed = new Date(query.to);
      if (!isNaN(parsed.getTime())) toDate = parsed;
    }

    const { items, total } = await this.telemetryRepo.findRange({
      deviceId,
      from: fromDate,
      to: toDate,
      skip,
      take: limit,
    });

    const snapshots = items.map(toTelemetrySnapshotDto);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      snapshots,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
