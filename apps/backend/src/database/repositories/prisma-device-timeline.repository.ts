import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  IDeviceTimelineRepository,
  CreateTimelineEventDto,
  TimelineEventDto,
  TimelineQueryOptions,
  PaginatedTimelineResponse,
} from '../../common/repositories/device-timeline.repository.interface';
import { TimelineEventType, TimelineSeverity, Prisma } from '@prisma/client';

@Injectable()
export class PrismaDeviceTimelineRepository implements IDeviceTimelineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async append(dto: CreateTimelineEventDto): Promise<TimelineEventDto> {
    const record = await this.prisma.deviceTimelineEvent.create({
      data: {
        deviceId: dto.deviceId,
        eventType: dto.eventType as TimelineEventType,
        severity: (dto.severity || 'INFO') as TimelineSeverity,
        title: dto.title,
        detail: dto.detail,
        actorId: dto.actorId,
        actorName: dto.actorName,
        relatedId: dto.relatedId,
        relatedType: dto.relatedType,
        metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    return this.mapToDto(record);
  }

  async getPaginated(options: TimelineQueryOptions): Promise<PaginatedTimelineResponse> {
    const limit = options.limit || 20;
    const page = options.page || 1;
    const skip = (page - 1) * limit;

    const where: Prisma.DeviceTimelineEventWhereInput = {
      deviceId: options.deviceId,
    };

    if (options.eventTypes && options.eventTypes.length > 0) {
      where.eventType = { in: options.eventTypes as TimelineEventType[] };
    }

    if (options.severity) {
      where.severity = options.severity as TimelineSeverity;
    }

    if (options.from || options.to) {
      where.timestamp = {};
      if (options.from) where.timestamp.gte = options.from;
      if (options.to) where.timestamp.lte = options.to;
    }

    const [items, total] = await Promise.all([
      this.prisma.deviceTimelineEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.deviceTimelineEvent.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      events: items.map((e) => this.mapToDto(e)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getRecent(deviceId: string, limit = 10): Promise<TimelineEventDto[]> {
    const records = await this.prisma.deviceTimelineEvent.findMany({
      where: { deviceId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    return records.map((e) => this.mapToDto(e));
  }

  private mapToDto(record: any): TimelineEventDto {
    return {
      id: record.id,
      deviceId: record.deviceId,
      eventType: record.eventType as any,
      severity: record.severity as any,
      title: record.title,
      detail: record.detail || undefined,
      actorId: record.actorId || undefined,
      actorName: record.actorName || undefined,
      relatedId: record.relatedId || undefined,
      relatedType: record.relatedType || undefined,
      metadata: record.metadata || undefined,
      timestamp: record.timestamp ? new Date(record.timestamp).toISOString() : new Date().toISOString(),
    };
  }
}
