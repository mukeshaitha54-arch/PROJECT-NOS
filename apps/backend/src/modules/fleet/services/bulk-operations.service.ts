import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { IAuditLogRepositoryToken, IAuditLogRepository } from '../../../common/repositories/tenant.repository.interface';
import { IDeviceRepositoryToken, IDeviceRepository } from '../../../common/repositories/device.repository.interface';
import { DeviceTimelineService } from '../../device/services/device-timeline.service';

export interface BulkActionDto {
  organizationId: string;
  deviceIds: string[];
  action: 'ASSIGN' | 'TRANSFER' | 'RETIRE' | 'MAINTENANCE' | 'UPDATE_TAGS' | 'MOVE';
  payload?: any;
  performedByUserId: string;
}

@Injectable()
export class BulkOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IAuditLogRepositoryToken) private readonly auditLogRepo: IAuditLogRepository,
    @Inject(IDeviceRepositoryToken) private readonly deviceRepo: IDeviceRepository,
    private readonly timelineService: DeviceTimelineService,
  ) {}

  async executeBulkAction(dto: BulkActionDto) {
    let updatedCount = 0;

    await this.prisma.$transaction(async (tx) => {
      // Validate devices belong to org
      const devices = await tx.device.findMany({
        where: {
          id: { in: dto.deviceIds },
          organizationId: dto.organizationId,
        },
      });

      if (devices.length === 0) return;

      const validDeviceIds = devices.map((d) => d.id);

      switch (dto.action) {
        case 'RETIRE':
          await tx.device.updateMany({
            where: { id: { in: validDeviceIds } },
            data: { status: 'OFFLINE', claimStatus: 'UNASSIGNED' }, // Simulate retire
          });
          break;
        case 'MAINTENANCE':
          const isMaintenance = dto.payload?.enabled ?? true;
          await tx.device.updateMany({
            where: { id: { in: validDeviceIds } },
            data: { status: isMaintenance ? 'MAINTENANCE' : 'ONLINE' },
          });
          break;
        case 'ASSIGN':
        case 'MOVE':
        case 'TRANSFER':
          // Update ownership
          for (const deviceId of validDeviceIds) {
            await tx.deviceOwnership.upsert({
              where: { deviceId },
              update: {
                assignedTeamId: dto.payload?.team,
                assignedDepartmentId: dto.payload?.department,
                branch: dto.payload?.branch,
              },
              create: {
                deviceId,
                organizationId: dto.organizationId,
                assignedTeamId: dto.payload?.team,
                assignedDepartmentId: dto.payload?.department,
                branch: dto.payload?.branch,
                criticality: 'MEDIUM',
                environment: 'PRODUCTION',
                purpose: 'GENERAL',
              },
            });
          }
          break;
        case 'UPDATE_TAGS':
          for (const deviceId of validDeviceIds) {
            // Very simple tag update logic for this phase
            await tx.deviceOwnership.updateMany({
              where: { deviceId },
              data: {
                purpose: dto.payload?.tags?.[0] || 'GENERAL',
              },
            });
          }
          break;
      }

      updatedCount = validDeviceIds.length;

      // 1. Write to Global Audit Log for the Org
      await this.auditLogRepo.record({
        organizationId: dto.organizationId,
        correlationId: 'N/A',
        userId: dto.performedByUserId,
        userEmail: 'bulk-action@system.local',
        action: `BULK_DEVICE_${dto.action}`,
        resourceType: 'DeviceBulk',
        resourceId: 'multiple',
        reason: dto.payload?.reason || 'Bulk operation via dashboard',
        ipAddress: 'unknown',
        browser: 'api',
        details: {
          deviceCount: updatedCount,
          deviceIds: validDeviceIds,
          payload: dto.payload,
        },
      });
      
      // 2. Write to permanent Device Timeline for EACH device affected
      for (const deviceId of validDeviceIds) {
        // Since we are in a transaction we can't easily use timelineService here if it creates separately,
        // but let's assume it manages its own transaction or we can just write directly.
        await tx.deviceTimelineEvent.create({
          data: {
            deviceId,
            eventType: 'SYSTEM_EVENT',
            severity: 'INFO',
            title: `Bulk Action: ${dto.action}`,
            detail: `Device modified via bulk ${dto.action} operation by operator.`,
            actorId: dto.performedByUserId,
            metadata: dto.payload || {},
          }
        });
      }
    });

    return { updatedCount };
  }
}
