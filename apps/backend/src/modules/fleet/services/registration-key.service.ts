import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { IRegistrationKeyRepository, IRegistrationKeyRepository as RegistrationKeyRepoToken } from '../../../common/repositories/registration-key.repository.interface';
import { IOrganizationRepositoryToken, IOrganizationRepository } from '../../../common/repositories/tenant.repository.interface';
import { RegistrationKey } from '@prisma/client';
import * as crypto from 'crypto';

export interface CreateRegistrationKeyDto {
  organizationId: string;
  displayName: string;
  maxUses?: number;
  expiresAt?: Date;
  allowedDepartments?: string[];
  allowedTeams?: string[];
  allowedGroups?: string[];
  allowedTags?: string[];
  createdBy: string;
}

@Injectable()
export class RegistrationKeyService {
  constructor(
    @Inject(RegistrationKeyRepoToken)
    private readonly registrationKeyRepo: IRegistrationKeyRepository,
    @Inject(IOrganizationRepositoryToken)
    private readonly orgRepo: IOrganizationRepository,
  ) {}

  async generateKey(dto: CreateRegistrationKeyDto): Promise<{ key: string; registrationKey: RegistrationKey }> {
    const org = await this.orgRepo.findById(dto.organizationId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Generate plain key: NOS-ABCD-1234-...
    const prefix = 'NOS';
    const randomPart = crypto.randomBytes(8).toString('hex').toUpperCase(); // 16 chars
    const plainKey = `${prefix}-${randomPart.slice(0, 4)}-${randomPart.slice(4, 8)}-${randomPart.slice(8, 12)}-${randomPart.slice(12, 16)}`;
    
    // Hash key
    const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');

    const newKey = await this.registrationKeyRepo.create({
      organizationId: dto.organizationId,
      displayName: dto.displayName,
      keyHash,
      keyPrefix: plainKey.substring(0, 13) + '********',
      status: 'ACTIVE',
      maxUses: dto.maxUses || 0,
      currentUses: 0,
      expiresAt: dto.expiresAt || null,
      allowedDepartments: dto.allowedDepartments || [],
      allowedTeams: dto.allowedTeams || [],
      allowedGroups: dto.allowedGroups || [],
      allowedTags: dto.allowedTags || [],
      createdBy: dto.createdBy,
      lastUsed: null,
      lastUsedBy: null,
      lastUsedIp: null,
      revokedBy: null,
      revokedReason: null,
      notes: null,
      totalGenerated: 1,
      failedAttempts: 0,
      devicesCreated: 0,
    });

    return { key: plainKey, registrationKey: newKey };
  }

  async validateKey(plainKey: string, ipAddress?: string): Promise<RegistrationKey> {
    const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');
    const registrationKey = await this.registrationKeyRepo.findByHash(keyHash);

    if (!registrationKey) {
      throw new BadRequestException('Invalid registration key');
    }

    if (registrationKey.status !== 'ACTIVE') {
      await this.registrationKeyRepo.recordFailedAttempt(registrationKey.id);
      throw new BadRequestException('Registration key is not active');
    }

    if (registrationKey.expiresAt && new Date() > registrationKey.expiresAt) {
      await this.registrationKeyRepo.recordFailedAttempt(registrationKey.id);
      throw new BadRequestException('Registration key has expired');
    }

    if (registrationKey.maxUses > 0 && registrationKey.currentUses >= registrationKey.maxUses) {
      await this.registrationKeyRepo.recordFailedAttempt(registrationKey.id);
      throw new BadRequestException('Registration key usage limit reached');
    }

    return registrationKey;
  }

  async revokeKey(id: string, revokedBy: string, reason: string): Promise<RegistrationKey> {
    return this.registrationKeyRepo.update(id, {
      status: 'REVOKED',
      revokedBy,
      revokedReason: reason,
    });
  }

  async getKeysByOrganization(organizationId: string): Promise<RegistrationKey[]> {
    return this.registrationKeyRepo.findByOrganizationId(organizationId);
  }

  async incrementKeyUsage(keyId: string, ipAddress?: string): Promise<void> {
    const key = await this.registrationKeyRepo.findById(keyId);
    if (!key) return;

    await this.registrationKeyRepo.update(keyId, {
      currentUses: key.currentUses + 1,
      lastUsed: new Date(),
      lastUsedIp: ipAddress,
    });
  }
}
