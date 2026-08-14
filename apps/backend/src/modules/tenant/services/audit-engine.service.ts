import { Injectable, Inject } from "@nestjs/common";
import {
  AuditLogDto,
  AuditSearchRequestDto,
  AuditSearchResultDto,
  AuditActionType,
  TenantContext,
} from "@nos/shared-types";
import {
  IAuditLogRepository,
  IAuditLogRepositoryToken,
} from "../../../common/repositories/tenant.repository.interface";

@Injectable()
export class AuditEngineService {
  constructor(
    @Inject(IAuditLogRepositoryToken)
    private readonly auditRepository: IAuditLogRepository,
  ) {}

  async logEvent(
    context: TenantContext,
    action: AuditActionType,
    resourceType?: string,
    resourceId?: string,
    reason?: string,
    details?: Record<string, any>,
  ): Promise<AuditLogDto> {
    return this.auditRepository.record({
      organizationId: context.organizationId || "default-org",
      userId: context.userId,
      action,
      resourceType,
      resourceId,
      reason,
      ipAddress: context.ipAddress || "127.0.0.1",
      browser: context.browser || "System/Worker",
      correlationId: context.correlationId || "no-correlation",
      details,
    });
  }

  async search(request: AuditSearchRequestDto): Promise<AuditSearchResultDto> {
    return this.auditRepository.search(request);
  }
}
