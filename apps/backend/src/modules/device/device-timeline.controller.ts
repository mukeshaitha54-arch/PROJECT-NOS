import { Controller, Get, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { DeviceTimelineQueryService } from './device-timeline.service';

@ApiTags('Device Timeline & Events')
@Controller('device')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class DeviceTimelineController {
  constructor(private readonly timelineService: DeviceTimelineQueryService) {}

  @Get(':deviceId/timeline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get paginated audit and event timeline for a specific device' })
  @ApiParam({ name: 'deviceId', description: 'Unique ID of the device' })
  async getDeviceTimeline(
    @Param('deviceId') deviceId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pageNum = Number(page) && Number(page) > 0 ? Number(page) : 1;
    const limitNum = Number(limit) && Number(limit) > 0 ? Number(limit) : 20;

    return this.timelineService.getTimeline({
      deviceId,
      page: pageNum,
      limit: limitNum,
    });
  }
}
