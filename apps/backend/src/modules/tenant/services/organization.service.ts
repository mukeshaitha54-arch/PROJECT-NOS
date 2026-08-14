import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  OrganizationDto,
  OrganizationStatus,
  OrganizationSettingsDto,
  OrganizationQuotaDto,
  AuditActionType,
  TenantContext,
  ErrorCode,
} from "@nos/shared-types";
import {
  IOrganizationRepository,
  IOrganizationRepositoryToken,
  IAuditLogRepository,
  IAuditLogRepositoryToken,
} from "../../../common/repositories/tenant.repository.interface";
import { QuotaEngineService } from "./quota-engine.service";

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(IOrganizationRepositoryToken)
    private readonly orgRepository: IOrganizationRepository,
    @Inject(IAuditLogRepositoryToken)
    private readonly auditRepository: IAuditLogRepository,
    private readonly quotaService: QuotaEngineService,
  ) {}

  async getById(id: string): Promise<OrganizationDto> {
    const org = await this.orgRepository.findById(id);
    if (!org) {
      throw new NotFoundException({
        code: "RESOURCE_NOT_FOUND",
        message: `Organization [${id}] not found.`,
      });
    }
    const usage = await this.quotaService.getQuotaUsage(id);
    return { ...org, quotaUsage: usage };
  }

  async create(
    data: {
      name: string;
      slug: string;
      settings?: Partial<OrganizationSettingsDto>;
      quota?: Partial<OrganizationQuotaDto>;
    },
    context: TenantContext,
  ): Promise<OrganizationDto> {
    const existing = await this.orgRepository.findBySlug(data.slug);
    if (existing) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Organization slug [${data.slug}] is already taken.`,
      });
    }

    const created = await this.orgRepository.create({
      name: data.name,
      slug: data.slug,
      status: OrganizationStatus.ACTIVE,
      settings: data.settings,
      quota: data.quota,
    });

    await this.auditRepository.record({
      organizationId: created.id,
      userId: context.userId,
      action: AuditActionType.ORG_LIFECYCLE_CHANGE,
      resourceType: "ORGANIZATION",
      resourceId: created.id,
      reason: "Created new enterprise organization tenant",
      ipAddress: context.ipAddress || "127.0.0.1",
      browser: context.browser || "System",
      correlationId: context.correlationId,
      details: { name: data.name, slug: data.slug },
    });

    return created;
  }

  async updateStatus(
    id: string,
    status: OrganizationStatus,
    context: TenantContext,
    reason?: string,
  ): Promise<OrganizationDto> {
    await this.getById(id);
    const updated = await this.orgRepository.updateStatus(id, status);

    await this.auditRepository.record({
      organizationId: id,
      userId: context.userId,
      action: AuditActionType.ORG_LIFECYCLE_CHANGE,
      resourceType: "ORGANIZATION",
      resourceId: id,
      reason: reason || `Updated organization status to ${status}`,
      ipAddress: context.ipAddress || "127.0.0.1",
      browser: context.browser || "System",
      correlationId: context.correlationId,
      details: { previousStatus: updated.status, newStatus: status },
    });

    return updated;
  }

  async updateSettings(
    id: string,
    settings: OrganizationSettingsDto,
    context: TenantContext,
  ): Promise<OrganizationDto> {
    await this.getById(id);
    const updated = await this.orgRepository.updateSettings(id, settings);

    await this.auditRepository.record({
      organizationId: id,
      userId: context.userId,
      action: AuditActionType.ORG_SETTINGS_UPDATE,
      resourceType: "ORGANIZATION",
      resourceId: id,
      reason: "Modified organization security and alert configuration policies",
      ipAddress: context.ipAddress || "127.0.0.1",
      browser: context.browser || "System",
      correlationId: context.correlationId,
    });

    return updated;
  }

  async archive(
    id: string,
    context: TenantContext,
    reason: string,
  ): Promise<void> {
    await this.updateStatus(id, OrganizationStatus.ARCHIVED, context, reason);
  }

  async softDelete(
    id: string,
    context: TenantContext,
    reason: string,
  ): Promise<void> {
    await this.getById(id);
    await this.orgRepository.softDelete(id);

    await this.auditRepository.record({
      organizationId: id,
      userId: context.userId,
      action: AuditActionType.ORG_LIFECYCLE_CHANGE,
      resourceType: "ORGANIZATION",
      resourceId: id,
      reason: reason || "Soft-deleted enterprise organization tenant",
      ipAddress: context.ipAddress || "127.0.0.1",
      browser: context.browser || "System",
      correlationId: context.correlationId,
    });
  }

  async restore(
    id: string,
    context: TenantContext,
    reason: string,
  ): Promise<OrganizationDto> {
    const restored = await this.orgRepository.restore(id);

    await this.auditRepository.record({
      organizationId: id,
      userId: context.userId,
      action: AuditActionType.ORG_LIFECYCLE_CHANGE,
      resourceType: "ORGANIZATION",
      resourceId: id,
      reason: reason || "Restored soft-deleted enterprise organization tenant",
      ipAddress: context.ipAddress || "127.0.0.1",
      browser: context.browser || "System",
      correlationId: context.correlationId,
    });

    return restored;
  }

  async listAll(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    return this.orgRepository.listAll(params);
  }
}
