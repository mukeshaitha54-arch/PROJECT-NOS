import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { MaintenanceService } from './services/maintenance.service';

@Controller('maintenance-windows')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  async getWindows(@Query('enabledOnly') enabledOnly?: string) {
    return this.maintenanceService.getWindows(enabledOnly === 'true');
  }

  @Get(':id')
  async getWindow(@Param('id') id: string) {
    return this.maintenanceService.getById(id);
  }

  @Post()
  async createWindow(@Body() body: { deviceId?: string; deviceGroupId?: string; title: string; startTime: string; endTime: string; reason: string; type?: string; enabled?: boolean }) {
    return this.maintenanceService.createWindow({
      deviceId: body.deviceId || null,
      deviceGroupId: body.deviceGroupId || null,
      title: body.title,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      reason: body.reason,
      type: body.type || 'SCHEDULED',
      enabled: body.enabled ?? true,
    });
  }

  @Put(':id')
  async updateWindow(@Param('id') id: string, @Body() body: any) {
    const updateData: any = { ...body };
    if (body.startTime) updateData.startTime = new Date(body.startTime);
    if (body.endTime) updateData.endTime = new Date(body.endTime);
    return this.maintenanceService.updateWindow(id, updateData);
  }

  @Delete(':id')
  async deleteWindow(@Param('id') id: string) {
    return { success: await this.maintenanceService.deleteWindow(id) };
  }
}
