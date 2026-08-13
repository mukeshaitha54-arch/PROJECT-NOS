import { Controller, Post, Get, Body, Param, UseGuards, Inject, Query, Delete } from '@nestjs/common';
import { RegistrationKeyService, CreateRegistrationKeyDto } from '../services/registration-key.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { IAuditLogRepositoryToken, IAuditLogRepository, IOrganizationRepositoryToken, IOrganizationRepository } from '../../../common/repositories/tenant.repository.interface';
import { IMailService, IMailServiceToken } from '../../../common/services/mail-service.interface';

@Controller('fleet/registration-keys')
@UseGuards(JwtAuthGuard)
export class RegistrationKeyController {
  constructor(
    private readonly registrationKeyService: RegistrationKeyService,
    @Inject(IAuditLogRepositoryToken)
    private readonly auditLogRepo: IAuditLogRepository,
    @Inject(IOrganizationRepositoryToken)
    private readonly orgRepo: IOrganizationRepository,
    @Inject(IMailServiceToken)
    private readonly mailService: IMailService,
  ) { }

  @Post()
  async generateKey(
    @Body() dto: Omit<CreateRegistrationKeyDto, 'createdBy'>,
    @CurrentUser() user: any,
  ) {
    const result = await this.registrationKeyService.generateKey({
      ...dto,
      createdBy: user.id,
    });

    await this.auditLogRepo.record({
      organizationId: dto.organizationId, correlationId: 'N/A',
      userId: user.id,
      userEmail: user.email,
      action: 'REGISTRATION_KEY_GENERATED',
      resourceType: 'RegistrationKey',
      resourceId: result.registrationKey.id,
      reason: 'Generated new agent registration key',
      ipAddress: user.ipAddress || 'unknown',
      browser: user.browser || 'unknown',
      details: {
        displayName: dto.displayName,
        keyPrefix: result.registrationKey.keyPrefix,
      },
    });

    const org = await this.orgRepo.findById(dto.organizationId);
    if (org) {
      await this.mailService.sendRegistrationKeyNotification(user.email, dto.displayName, org.name);
    }

    return {
      plainKey: result.key,
      success: true,
      data: result,
      message: 'IMPORTANT: The plain key will only be shown this one time.',
    };
  }

  @Get()
  async getKeys(@Query('organizationId') orgId: string) {
    const keys = await this.registrationKeyService.getKeysByOrganization(orgId);
    return keys; // Return the array directly or wrapped depending on what frontend expects. The user's code just says api.get(...)
  }

  @Delete(':id')
  async revokeKey(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    // In a real implementation we would fetch the key first to get the orgId for the audit log
    const revoked = await this.registrationKeyService.revokeKey(id, user.id, 'Revoked via UI');

    await this.auditLogRepo.record({
      organizationId: revoked.organizationId, correlationId: 'N/A',
      userId: user.id,
      userEmail: user.email,
      action: 'REGISTRATION_KEY_REVOKED',
      resourceType: 'RegistrationKey',
      resourceId: id,
      reason: 'Revoked via UI',
      ipAddress: user.ipAddress || 'unknown',
      browser: user.browser || 'unknown',
      details: {
        keyPrefix: revoked.keyPrefix,
      },
    });

    return {
      success: true,
      data: revoked,
    };
  }
}
