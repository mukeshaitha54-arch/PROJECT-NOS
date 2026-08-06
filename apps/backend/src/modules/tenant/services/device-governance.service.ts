import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  DeviceOwnershipDto,
  DeviceGroupDto,
  DeviceTransferRequestDto,
  DeviceTransferStatus,
  PermissionProfileDto,
  RoleTemplateDto,
  AuditActionType,
  TenantContext,
  ErrorCode,
} from '@nos/shared-types';
import {
  IDeviceGovernanceRepository,
  IDeviceGovernanceRepositoryToken,
} from '../../../common/repositories/tenant.repository.interface';
import { IDeviceRepository, IDeviceRepositoryToken } from '../../../common/repositories/device.repository.interface';
import { AuditEngineService } from './audit-engine.service';

@Injectable()
export class DeviceGovernanceService {
  constructor(
    @Inject(IDeviceGovernanceRepositoryToken)
    private readonly governanceRepository: IDeviceGovernanceRepository,
    @Inject(IDeviceRepositoryToken)
    private readonly deviceRepository: IDeviceRepository,
    private readonly auditService: AuditEngineService,
  ) {}

  async assignOwnership(
    deviceId: string,
    organizationId: string,
    data: Partial<DeviceOwnershipDto>,
    context: TenantContext,
  ): Promise<DeviceOwnershipDto> {
    const device = await this.deviceRepository.findById(deviceId);
    if (!device) {
      throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: `Device [${deviceId}] not found.` });
    }

    const ownership = await this.governanceRepository.assignOwnership(deviceId, organizationId, data);

    await this.auditService.logEvent(
      context,
      AuditActionType.INVENTORY_UPDATE,
      'DEVICE',
      deviceId,
      `Assigned device to owner user [${data.ownerUserId || 'none'}], team [${data.assignedTeamId || 'none'}] in org [${organizationId}]`,
      data,
    );

    return ownership;
  }

  async getOwnership(deviceId: string, organizationId: string): Promise<DeviceOwnershipDto | null> {
    return this.governanceRepository.getOwnership(deviceId, organizationId);
  }

  async createDeviceGroup(
    organizationId: string,
    name: string,
    groupType: string,
    context: TenantContext,
    description?: string,
    filterCriteria?: Record<string, any>,
    deviceIds?: string[],
  ): Promise<DeviceGroupDto> {
    let matchedDeviceIds = deviceIds || [];

    // If Smart/Dynamic group, evaluate filters against current organization devices
    if (groupType === 'DYNAMIC' && filterCriteria) {
      const allDevices = await this.deviceRepository.findAll(organizationId);
      matchedDeviceIds = allDevices
        .filter((d: any) => {
          if (filterCriteria.os && d.os !== filterCriteria.os) return false;
          if (filterCriteria.status && d.status !== filterCriteria.status) return false;
          if (filterCriteria.architecture && d.architecture !== filterCriteria.architecture) return false;
          if (filterCriteria.hostnameContains && !d.hostname?.toLowerCase().includes(String(filterCriteria.hostnameContains).toLowerCase())) return false;
          return true;
        })
        .map((d: any) => d.id);
    }

    const group = await this.governanceRepository.createDeviceGroup(
      organizationId,
      name,
      groupType,
      description,
      filterCriteria,
      matchedDeviceIds,
    );

    await this.auditService.logEvent(
      context,
      AuditActionType.ORG_SETTINGS_UPDATE,
      'DEVICE_GROUP',
      group.id,
      `Created ${groupType} device group [${name}] matching ${matchedDeviceIds.length} devices`,
      { filterCriteria, matchedCount: matchedDeviceIds.length },
    );

    return group;
  }

  async listDeviceGroups(organizationId: string): Promise<DeviceGroupDto[]> {
    return this.governanceRepository.listDeviceGroups(organizationId);
  }

  async createTransferRequest(
    deviceId: string,
    fromOrgId: string,
    toOrgId: string,
    reason: string,
    context: TenantContext,
  ): Promise<DeviceTransferRequestDto> {
    const request = await this.governanceRepository.createTransferRequest(
      deviceId,
      fromOrgId,
      toOrgId,
      context.userId || 'system',
      reason,
    );

    await this.auditService.logEvent(
      context,
      AuditActionType.DEVICE_TRANSFER,
      'DEVICE_TRANSFER',
      request.id,
      `Requested device transfer from [${fromOrgId}] to [${toOrgId}]: ${reason}`,
      { deviceId, fromOrgId, toOrgId },
    );

    return request;
  }

  async resolveTransferRequest(
    id: string,
    status: DeviceTransferStatus,
    context: TenantContext,
  ): Promise<DeviceTransferRequestDto> {
    if (status !== DeviceTransferStatus.APPROVED && status !== DeviceTransferStatus.REJECTED) {
      throw new BadRequestException({ code: ErrorCode.VALIDATION_ERROR, message: 'Status must be APPROVED or REJECTED.' });
    }

    const resolved = await this.governanceRepository.resolveTransferRequest(id, status, context.userId);

    const auditType = AuditActionType.DEVICE_TRANSFER;
    await this.auditService.logEvent(
      context,
      auditType,
      'DEVICE_TRANSFER',
      resolved.id,
      `Resolved device transfer request with status: ${status}`,
      { approvedByUserId: context.userId },
    );

    return resolved;
  }

  async listTransferRequests(organizationId: string, type: 'INCOMING' | 'OUTGOING') {
    return this.governanceRepository.listTransferRequests(organizationId, type);
  }

  async listPermissionProfiles(organizationId: string): Promise<PermissionProfileDto[]> {
    return this.governanceRepository.listPermissionProfiles(organizationId);
  }

  async createPermissionProfile(
    organizationId: string,
    name: string,
    permissions: string[],
    description?: string,
    abacConditions?: Record<string, any>,
  ): Promise<PermissionProfileDto> {
    return this.governanceRepository.createPermissionProfile(organizationId, name, permissions, description, abacConditions);
  }

  async listRoleTemplates(): Promise<RoleTemplateDto[]> {
    return this.governanceRepository.listRoleTemplates();
  }
}
