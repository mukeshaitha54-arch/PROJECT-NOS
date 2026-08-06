import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IDeviceGovernanceRepository } from '../../common/repositories/tenant.repository.interface';
import {
  DeviceOwnershipDto,
  DeviceGroupDto,
  DeviceGroupType,
  DeviceTransferRequestDto,
  DeviceTransferStatus,
  PermissionProfileDto,
  PermissionFlag,
  RoleTemplateDto,
  UserRole,
} from '@nos/shared-types';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaDeviceGovernanceRepository implements IDeviceGovernanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async assignOwnership(deviceId: string, organizationId: string, data: Partial<DeviceOwnershipDto>): Promise<DeviceOwnershipDto> {
    const upserted = await this.prisma.deviceOwnership.upsert({
      where: { deviceId },
      update: {
        organizationId,
        ownerUserId: data.ownerUserId ?? null,
        assignedTeamId: data.assignedTeamId ?? null,
        assignedDepartmentId: data.assignedDepartmentId ?? null,
        assignedOperatorId: data.assignedOperatorId ?? null,
        groupIds: data.groupIds ?? [],
      },
      create: {
        deviceId,
        organizationId,
        ownerUserId: data.ownerUserId ?? null,
        assignedTeamId: data.assignedTeamId ?? null,
        assignedDepartmentId: data.assignedDepartmentId ?? null,
        assignedOperatorId: data.assignedOperatorId ?? null,
        groupIds: data.groupIds ?? [],
      },
    });

    // Also update device's organizationId
    await this.prisma.device.update({
      where: { id: deviceId },
      data: { organizationId },
    }).catch(() => null);

    return {
      id: upserted.id,
      deviceId: upserted.deviceId,
      organizationId: upserted.organizationId,
      ownerUserId: upserted.ownerUserId || null,
      assignedTeamId: upserted.assignedTeamId || null,
      assignedDepartmentId: upserted.assignedDepartmentId || null,
      assignedOperatorId: upserted.assignedOperatorId || null,
      groupIds: upserted.groupIds,
      assignedAt: upserted.assignedAt.toISOString(),
      updatedAt: upserted.updatedAt.toISOString(),
    };
  }

  async getOwnership(deviceId: string, organizationId: string): Promise<DeviceOwnershipDto | null> {
    const found = await this.prisma.deviceOwnership.findFirst({
      where: { deviceId, organizationId },
    });
    if (!found) return null;
    return {
      id: found.id,
      deviceId: found.deviceId,
      organizationId: found.organizationId,
      ownerUserId: found.ownerUserId || null,
      assignedTeamId: found.assignedTeamId || null,
      assignedDepartmentId: found.assignedDepartmentId || null,
      assignedOperatorId: found.assignedOperatorId || null,
      groupIds: found.groupIds,
      assignedAt: found.assignedAt.toISOString(),
      updatedAt: found.updatedAt.toISOString(),
    };
  }

  async createDeviceGroup(organizationId: string, name: string, groupType: string, description?: string, filterCriteria?: Record<string, unknown>, deviceIds?: string[]): Promise<DeviceGroupDto> {
    const created = await this.prisma.deviceGroup.create({
      data: {
        organizationId,
        name,
        groupType: groupType || 'STATIC',
        description: description || null,
        filterCriteria: filterCriteria ? (filterCriteria as unknown as Prisma.InputJsonValue) : null,
        deviceIds: deviceIds ?? [],
        deviceCount: deviceIds ? deviceIds.length : 0,
      },
    });
    return {
      id: created.id,
      organizationId: created.organizationId,
      name: created.name,
      description: created.description || undefined,
      groupType: created.groupType as DeviceGroupType,
      filterCriteria: created.filterCriteria ? (created.filterCriteria as unknown as Record<string, unknown>) : undefined,
      deviceIds: created.deviceIds,
      deviceCount: created.deviceCount,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async listDeviceGroups(organizationId: string): Promise<DeviceGroupDto[]> {
    const rows = await this.prisma.deviceGroup.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
    return rows.map(g => ({
      id: g.id,
      organizationId: g.organizationId,
      name: g.name,
      description: g.description || undefined,
      groupType: g.groupType as DeviceGroupType,
      filterCriteria: g.filterCriteria ? (g.filterCriteria as unknown as Record<string, unknown>) : undefined,
      deviceIds: g.deviceIds,
      deviceCount: g.deviceCount,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    }));
  }

  async createTransferRequest(deviceId: string, fromOrgId: string, toOrgId: string, requestedBy: string, reason: string): Promise<DeviceTransferRequestDto> {
    const req = await this.prisma.deviceTransferRequest.create({
      data: {
        deviceId,
        fromOrganizationId: fromOrgId,
        toOrganizationId: toOrgId,
        requestedByUserId: requestedBy,
        status: DeviceTransferStatus.PENDING_APPROVAL,
        reason,
      },
    });
    return {
      id: req.id,
      deviceId: req.deviceId,
      fromOrganizationId: req.fromOrganizationId,
      toOrganizationId: req.toOrganizationId,
      requestedByUserId: req.requestedByUserId,
      approvedByUserId: req.approvedByUserId || null,
      status: req.status as DeviceTransferStatus,
      reason: req.reason,
      createdAt: req.createdAt.toISOString(),
      resolvedAt: req.resolvedAt ? req.resolvedAt.toISOString() : null,
    };
  }

  async resolveTransferRequest(id: string, status: string, approvedByUserId?: string): Promise<DeviceTransferRequestDto> {
    const updated = await this.prisma.deviceTransferRequest.update({
      where: { id },
      data: {
        status,
        approvedByUserId: approvedByUserId || null,
        resolvedAt: new Date(),
      },
    });

    if (status === DeviceTransferStatus.APPROVED) {
      // Execute transfer
      await this.assignOwnership(updated.deviceId, updated.toOrganizationId, {});
    }

    return {
      id: updated.id,
      deviceId: updated.deviceId,
      fromOrganizationId: updated.fromOrganizationId,
      toOrganizationId: updated.toOrganizationId,
      requestedByUserId: updated.requestedByUserId,
      approvedByUserId: updated.approvedByUserId || null,
      status: updated.status as DeviceTransferStatus,
      reason: updated.reason,
      createdAt: updated.createdAt.toISOString(),
      resolvedAt: updated.resolvedAt ? updated.resolvedAt.toISOString() : null,
    };
  }

  async listTransferRequests(organizationId: string, type: 'INCOMING' | 'OUTGOING'): Promise<DeviceTransferRequestDto[]> {
    const where = type === 'INCOMING'
      ? { toOrganizationId: organizationId }
      : { fromOrganizationId: organizationId };

    const list = await this.prisma.deviceTransferRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return list.map(r => ({
      id: r.id,
      deviceId: r.deviceId,
      fromOrganizationId: r.fromOrganizationId,
      toOrganizationId: r.toOrganizationId,
      requestedByUserId: r.requestedByUserId,
      approvedByUserId: r.approvedByUserId || null,
      status: r.status as DeviceTransferStatus,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    }));
  }

  async listPermissionProfiles(organizationId: string): Promise<PermissionProfileDto[]> {
    const list = await this.prisma.permissionProfile.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
    return list.map(p => ({
      id: p.id,
      organizationId: p.organizationId,
      name: p.name,
      description: p.description || undefined,
      permissions: p.permissions as PermissionFlag[],
      abacConditions: p.abacConditions ? (p.abacConditions as unknown as Record<string, unknown>) : undefined,
      isBuiltIn: p.isBuiltIn,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  async createPermissionProfile(organizationId: string, name: string, permissions: string[], description?: string, abacConditions?: Record<string, unknown>): Promise<PermissionProfileDto> {
    const created = await this.prisma.permissionProfile.create({
      data: {
        organizationId,
        name,
        permissions,
        description: description || null,
        abacConditions: abacConditions ? (abacConditions as unknown as Prisma.InputJsonValue) : null,
        isBuiltIn: false,
      },
    });
    return {
      id: created.id,
      organizationId: created.organizationId,
      name: created.name,
      description: created.description || undefined,
      permissions: created.permissions as PermissionFlag[],
      abacConditions: created.abacConditions ? (created.abacConditions as unknown as Record<string, unknown>) : undefined,
      isBuiltIn: created.isBuiltIn,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async listRoleTemplates(): Promise<RoleTemplateDto[]> {
    const list = await this.prisma.roleTemplate.findMany();
    return list.map(r => ({
      id: r.id,
      name: r.name,
      baseRole: r.baseRole as UserRole,
      defaultPermissions: r.defaultPermissions as PermissionFlag[],
      description: r.description,
    }));
  }
}
