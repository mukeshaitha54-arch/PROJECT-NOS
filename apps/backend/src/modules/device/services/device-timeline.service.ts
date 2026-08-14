import { Injectable, Inject, Logger } from "@nestjs/common";
import {
  IDeviceTimelineRepository,
  CreateTimelineEventDto,
  TimelineEventDto,
  TimelineQueryOptions,
  PaginatedTimelineResponse,
} from "../../../common/repositories/device-timeline.repository.interface";

@Injectable()
export class DeviceTimelineService {
  private readonly logger = new Logger(DeviceTimelineService.name);

  constructor(
    @Inject(IDeviceTimelineRepository)
    private readonly timelineRepo: IDeviceTimelineRepository,
  ) {}

  async logEvent(dto: CreateTimelineEventDto): Promise<TimelineEventDto> {
    try {
      const event = await this.timelineRepo.append(dto);
      this.logger.debug(
        `[Timeline] Logged ${dto.eventType} for device ${dto.deviceId}: "${dto.title}"`,
      );
      return event;
    } catch (err: any) {
      this.logger.error(
        `[Timeline] Failed to log event for device ${dto.deviceId}: ${err?.message}`,
      );
      throw err;
    }
  }

  async getPaginatedTimeline(
    options: TimelineQueryOptions,
  ): Promise<PaginatedTimelineResponse> {
    return this.timelineRepo.getPaginated(options);
  }

  async getRecentTimeline(
    deviceId: string,
    limit = 10,
  ): Promise<TimelineEventDto[]> {
    return this.timelineRepo.getRecent(deviceId, limit);
  }
}
