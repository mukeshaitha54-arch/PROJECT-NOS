import { Injectable, Inject, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  ApiKeyDto,
  ApiKeyCreateRequestDto,
  AuditActionType,
  TenantContext,
  ErrorCode,
} from '@nos/shared-types';
import {
  IApiKeyRepository,
  IApiKeyRepositoryToken,
} from '../../../common/repositories/tenant.repository.interface';
import { QuotaEngineService } from './quota-engine.service';
import { AuditEngineService } from './audit-engine.service';

@Injectable()
export class ApiKeyService {
  constructor(
    @Inject(IApiKeyRepositoryToken) private readonly apiKeyRepository: IApiKeyRepository,
    private readonly quotaService: QuotaEngineService,
    private readonly auditService: AuditEngineService,
  ) {}

  private hashKey(plainKey: string): string {
    return crypto.createHash('sha256').update(plainKey).digest('hex');
  }

  async generate(
    organizationId: string,
    createdByUserId: string,
    data: ApiKeyCreateRequestDto,
    context: TenantContext,
  ): Promise<{ apiKey: ApiKeyDto; plainKey: string }> {
    // Check quota before creating new API key
    await this.quotaService.checkQuotaConsumption(organizationId, 'API_KEYS');

    const randomSecret = crypto.randomBytes(24).toString('hex');
    const keyPrefix = `nos_live_${randomSecret.substring(0, 8)}`;
    const plainKey = `nos_live_${randomSecret}`;
    const tokenHash = this.hashKey(plainKey);

    const apiKey = await this.apiKeyRepository.create(organizationId, createdByUserId, data, keyPrefix, tokenHash);

    await this.auditService.logEvent(
      context,
      AuditActionType.API_KEY_CREATE,
      'ApiKey',
      apiKey.id,
      `Generated new API key '${data.name}' with scopes [${data.scopes.join(', ')}]`,
      { scopes: data.scopes, allowedIps: data.allowedIps },
    );

    return { apiKey, plainKey };
  }

  async validateAndRecordUsage(plainKey: string): Promise<ApiKeyDto> {
    const tokenHash = this.hashKey(plainKey);
    const key = await this.apiKeyRepository.findByTokenHash(tokenHash);
    if (!key) {
      throw new UnauthorizedException({ code: ErrorCode.UNAUTHORIZED, message: 'Invalid or revoked API key.' });
    }
    if (new Date(key.expiresAt) < new Date()) {
      throw new UnauthorizedException({ code: ErrorCode.UNAUTHORIZED, message: 'API key has expired.' });
    }

    await this.apiKeyRepository.recordUsage(key.id);
    return key;
  }

  async list(organizationId: string, params?: { page?: number; limit?: number; search?: string }) {
    return this.apiKeyRepository.listByOrganization(organizationId, params);
  }

  async revoke(organizationId: string, id: string, context: TenantContext, reason?: string): Promise<void> {
    await this.apiKeyRepository.revoke(organizationId, id);

    await this.auditService.logEvent(
      context,
      AuditActionType.API_KEY_REVOKE,
      'ApiKey',
      id,
      reason || 'Revoked enterprise API key due to governance policy or security rotation',
    );
  }
}
