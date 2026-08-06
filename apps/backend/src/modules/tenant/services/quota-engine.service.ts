import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  OrganizationQuotaDto,
  OrganizationQuotaUsageDto,
  ErrorCode,
} from '@nos/shared-types';
import {
  IOrganizationRepository,
  IOrganizationRepositoryToken,
  ITeamRepository,
  ITeamRepositoryToken,
  IApiKeyRepository,
  IApiKeyRepositoryToken,
} from '../../../common/repositories/tenant.repository.interface';
import { IUserRepository, IUserRepositoryToken } from '../../../common/repositories/user.repository.interface';
import { IDeviceRepository, IDeviceRepositoryToken } from '../../../common/repositories/device.repository.interface';

@Injectable()
export class QuotaEngineService {
  constructor(
    @Inject(IOrganizationRepositoryToken) private readonly orgRepository: IOrganizationRepository,
    @Inject(ITeamRepositoryToken) private readonly teamRepository: ITeamRepository,
    @Inject(IApiKeyRepositoryToken) private readonly apiKeyRepository: IApiKeyRepository,
    @Inject(IDeviceRepositoryToken) private readonly deviceRepository: IDeviceRepository,
  ) {}

  async getQuotaUsage(organizationId: string): Promise<OrganizationQuotaUsageDto> {
    const quota = await this.orgRepository.getQuota(organizationId);
    const defaults: OrganizationQuotaDto = quota || {
      maxDevices: 50,
      maxUsers: 10,
      maxApiKeys: 10,
      maxStorageMb: 1024,
      maxDailyTelemetry: 100000,
      maxDailyAlerts: 5000,
    };

    const [devicesCount, membersRes, apiKeysRes] = await Promise.all([
      this.deviceRepository.countByOrganization
        ? this.deviceRepository.countByOrganization(organizationId).catch(() => 0)
        : this.deviceRepository.findAll(organizationId).then(list => list.length).catch(() => 0),
      this.teamRepository.listMembers(organizationId).catch(() => ({ total: 1 })),
      this.apiKeyRepository.listByOrganization(organizationId).catch(() => ({ total: 0 })),
    ]);

    const currentDevices = devicesCount || 0;
    const currentUsers = membersRes.total || 1;
    const currentApiKeys = apiKeysRes.total || 0;
    const currentStorageMb = Math.round(currentDevices * 4.5); // Estimated storage based on device snapshots
    const currentDailyTelemetry = currentDevices * 240; // Simulated active metric points per day
    const currentDailyAlerts = Math.round(currentDevices * 2);

    const ratio = currentDevices / Math.max(1, defaults.maxDevices);
    const isApproachingLimit = ratio >= 0.8 && ratio < 1.0;
    const isLimitExceeded = ratio >= 1.0 || currentUsers > defaults.maxUsers;
    const percentUsed = Math.min(100, Math.round(ratio * 100));

    return {
      ...defaults,
      currentDevices,
      currentUsers,
      currentApiKeys,
      currentStorageMb,
      currentDailyTelemetry,
      currentDailyAlerts,
      isApproachingLimit,
      isLimitExceeded,
      percentUsed,
    };
  }

  async checkQuotaConsumption(organizationId: string, resource: 'DEVICES' | 'USERS' | 'API_KEYS'): Promise<void> {
    const usage = await this.getQuotaUsage(organizationId);

    if (resource === 'DEVICES' && usage.currentDevices >= usage.maxDevices) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Organization [${organizationId}] device quota exceeded (${usage.currentDevices}/${usage.maxDevices}). Please upgrade quota.`,
      });
    }

    if (resource === 'USERS' && usage.currentUsers >= usage.maxUsers) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Organization [${organizationId}] user quota exceeded (${usage.currentUsers}/${usage.maxUsers}). Please upgrade quota.`,
      });
    }

    if (resource === 'API_KEYS' && usage.currentApiKeys >= usage.maxApiKeys) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Organization [${organizationId}] API key quota exceeded (${usage.currentApiKeys}/${usage.maxApiKeys}). Please upgrade quota.`,
      });
    }
  }

  async updateQuota(organizationId: string, updates: Partial<OrganizationQuotaDto>): Promise<OrganizationQuotaUsageDto> {
    await this.orgRepository.updateQuota(organizationId, updates);
    return this.getQuotaUsage(organizationId);
  }
}
