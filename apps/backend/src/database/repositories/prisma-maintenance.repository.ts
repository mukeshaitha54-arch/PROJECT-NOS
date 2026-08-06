import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IMaintenanceRepository, MaintenanceWindowCreateInput } from '../../common/repositories/maintenance.repository.interface';
import { MaintenanceWindow, Prisma } from '@prisma/client';

@Injectable()
export class PrismaMaintenanceRepository implements IMaintenanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: MaintenanceWindowCreateInput): Promise<MaintenanceWindow> {
    return this.prisma.maintenanceWindow.create({
      data: {
        deviceId: data.deviceId || null,
        deviceGroupId: data.deviceGroupId || null,
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason,
        type: data.type || 'SCHEDULED',
        enabled: data.enabled ?? true,
      },
    });
  }

  async findById(id: string): Promise<MaintenanceWindow | null> {
    return this.prisma.maintenanceWindow.findUnique({ where: { id } });
  }

  async findActiveByDevice(deviceId: string, atTime = new Date()): Promise<MaintenanceWindow[]> {
    return this.prisma.maintenanceWindow.findMany({
      where: {
        enabled: true,
        startTime: { lte: atTime },
        endTime: { gte: atTime },
        OR: [
          { deviceId: deviceId },
          { deviceId: null, deviceGroupId: null }, // Fleet-wide window
        ],
      },
    });
  }

  async findMany(enabledOnly = false): Promise<MaintenanceWindow[]> {
    const where: Prisma.MaintenanceWindowWhereInput = {};
    if (enabledOnly) where.enabled = true;
    return this.prisma.maintenanceWindow.findMany({
      where,
      orderBy: { startTime: 'desc' },
    });
  }

  async update(id: string, data: Partial<MaintenanceWindow>): Promise<MaintenanceWindow> {
    const updateData: Record<string, unknown> = { ...data };
    delete updateData.id;
    delete updateData.createdAt;
    return this.prisma.maintenanceWindow.update({
      where: { id },
      data: updateData as Prisma.MaintenanceWindowUpdateInput,
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.maintenanceWindow.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
