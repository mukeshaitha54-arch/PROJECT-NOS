import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Inject,
  Query,
  Delete,
  UnauthorizedException,
} from "@nestjs/common";
import {
  RegistrationKeyService,
  CreateRegistrationKeyDto,
} from "../services/registration-key.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import {
  IAuditLogRepositoryToken,
  IAuditLogRepository,
  IOrganizationRepositoryToken,
  IOrganizationRepository,
} from "../../../common/repositories/tenant.repository.interface";
import {
  IMailService,
  IMailServiceToken,
} from "../../../common/services/mail-service.interface";

@Controller("fleet/registration-keys")
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
  ) {}

  @Post()
  async generateKey(
    @Body() dto: Omit<CreateRegistrationKeyDto, "createdBy">,
    @CurrentUser() user: any,
  ) {
    const userOrgId = user?.organizationId || user?.organization?.id;
    if (
      userOrgId &&
      userOrgId !== "default-org" &&
      dto.organizationId &&
      dto.organizationId !== userOrgId &&
      user?.role !== "SUPER_ADMIN"
    ) {
      throw new UnauthorizedException(
        "Unauthorized cross-tenant key generation attempt",
      );
    }
    const result = await this.registrationKeyService.generateKey({
      ...dto,
      createdBy: user.id,
    });

    try {
      await this.auditLogRepo.record({
        organizationId: result.registrationKey.organizationId,
        correlationId: "N/A",
        userId: user?.id || "system",
        userEmail: user?.email || "unknown",
        action: "REGISTRATION_KEY_GENERATED",
        resourceType: "RegistrationKey",
        resourceId: result.registrationKey.id,
        reason: "Generated new agent registration key",
        ipAddress: user?.ipAddress || "unknown",
        browser: user?.browser || "unknown",
        details: {
          displayName: dto.displayName,
          keyPrefix: result.registrationKey.keyPrefix,
        },
      });
    } catch {}

    try {
      const org = await this.orgRepo.findById(
        result.registrationKey.organizationId,
      );
      if (org && user?.email) {
        await this.mailService.sendRegistrationKeyNotification(
          user.email,
          dto.displayName,
          org.name,
        );
      }
    } catch {}

    return {
      plainKey: result.key,
      success: true,
      data: result,
      message: "IMPORTANT: The plain key will only be shown this one time.",
    };
  }

  @Get("organization/:orgId")
  async getKeys(@Param("orgId") orgId: string, @CurrentUser() user: any) {
    const userOrgId = user?.organizationId || user?.organization?.id;
    if (
      userOrgId &&
      userOrgId !== "default-org" &&
      userOrgId !== orgId &&
      user?.role !== "SUPER_ADMIN"
    ) {
      throw new UnauthorizedException(
        "Unauthorized access to organization keys",
      );
    }
    const keys = await this.registrationKeyService.getKeysByOrganization(orgId);
    return keys;
  }

  @Post(":id/revoke")
  async revokeKey(@Param("id") id: string, @CurrentUser() user: any) {
    const key = await this.registrationKeyService.getKeyById(id);
    const userOrgId = user?.organizationId || user?.organization?.id;
    if (
      key &&
      userOrgId &&
      userOrgId !== "default-org" &&
      key.organizationId !== userOrgId &&
      user?.role !== "SUPER_ADMIN"
    ) {
      throw new UnauthorizedException(
        "Unauthorized cross-tenant key revocation attempt",
      );
    }

    const revoked = await this.registrationKeyService.revokeKey(
      id,
      user.id,
      "Revoked via UI",
    );

    await this.auditLogRepo.record({
      organizationId: revoked.organizationId,
      correlationId: "N/A",
      userId: user.id,
      userEmail: user.email,
      action: "REGISTRATION_KEY_REVOKED",
      resourceType: "RegistrationKey",
      resourceId: id,
      reason: "Revoked via UI",
      ipAddress: user.ipAddress || "unknown",
      browser: user.browser || "unknown",
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
