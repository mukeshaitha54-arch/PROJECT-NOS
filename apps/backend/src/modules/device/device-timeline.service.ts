import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface DeviceTimelineParams {
  deviceId: string;
  page: number;
  limit: number;
}

@Injectable()
export class DeviceTimelineQueryService {
  private readonly logger = new Logger(DeviceTimelineQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTimeline(params: DeviceTimelineParams) {
    const { deviceId, page, limit } = params;
    const skip = (page - 1) * limit;

    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException(`Device with ID [${deviceId}] not found.`);
    }

    const [total, events] = await Promise.all([
      this.prisma.deviceTimelineEvent.count({ where: { deviceId } }),
      this.prisma.deviceTimelineEvent.findMany({
        where: { deviceId },
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const data = events.map((event) => ({
      id: event.id,
      deviceId: event.deviceId,
      eventType: event.eventType,
      severity: event.severity,
      title: event.title,
      detail: event.detail,
      description: event.detail || event.title,
      actor: event.actorName || event.actorId || "System",
      actorId: event.actorId,
      actorName: event.actorName,
      relatedId: event.relatedId,
      relatedType: event.relatedType,
      metadata: event.metadata || {},
      timestamp: event.timestamp,
      createdAt: event.timestamp,
    }));

    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
      },
    };
  }
}
