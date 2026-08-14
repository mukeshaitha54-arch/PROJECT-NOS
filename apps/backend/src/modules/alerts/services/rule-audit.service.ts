import { Injectable, Inject, Logger } from "@nestjs/common";
import {
  IAlertRuleAuditRepository,
  AlertRuleAuditCreateInput,
} from "../../../common/repositories/alert-rule-audit.repository.interface";
import { RuleAuditEntryDto } from "@nos/shared-types";
import { AlertRuleAuditLog } from "@prisma/client";

/**
 * RuleAuditService — 1% Enterprise Feature 5
 * Every rule mutation stores: oldValue, newValue, operator, version,
 * timestamp, correlationId, IP, browser, reason.
 * Zero Prisma leakage — all DB access via IAlertRuleAuditRepository.
 */
@Injectable()
export class RuleAuditService {
  private readonly logger = new Logger(RuleAuditService.name);

  constructor(
    @Inject(IAlertRuleAuditRepository)
    private readonly auditRepo: IAlertRuleAuditRepository,
  ) {}

  /**
   * Record a rule mutation audit event.
   * Call this before or after every CREATE / UPDATE / DELETE / ARCHIVE / CLONE / IMPORT / EXPORT / SIMULATE / REPLAY / DRY_RUN.
   */
  async record(data: AlertRuleAuditCreateInput): Promise<AlertRuleAuditLog> {
    this.logger.log(
      `[RuleAudit] ${data.action} on rule ${data.ruleId} v${data.version} by ${data.performedBy}` +
        (data.correlationId ? ` (corr: ${data.correlationId})` : ""),
    );
    return this.auditRepo.create(data);
  }

  /**
   * Record a field-level diff audit (for UPDATE operations).
   */
  async recordFieldChange(params: {
    ruleId: string;
    field: string;
    oldValue: string | number | boolean | null;
    newValue: string | number | boolean | null;
    version: number;
    performedBy: string;
    reason?: string;
    correlationId?: string;
    ipAddress?: string;
    browser?: string;
  }): Promise<AlertRuleAuditLog> {
    return this.record({
      ruleId: params.ruleId,
      action: "UPDATE",
      field: params.field,
      oldValue:
        params.oldValue !== null && params.oldValue !== undefined
          ? String(params.oldValue)
          : null,
      newValue:
        params.newValue !== null && params.newValue !== undefined
          ? String(params.newValue)
          : null,
      version: params.version,
      performedBy: params.performedBy,
      reason: params.reason,
      correlationId: params.correlationId,
      ipAddress: params.ipAddress,
      browser: params.browser,
    });
  }

  /**
   * Retrieve full audit trail for a rule, newest-first.
   */
  async getAuditTrail(
    ruleId: string,
    skip = 0,
    take = 50,
  ): Promise<{
    entries: RuleAuditEntryDto[];
    total: number;
  }> {
    const [logs, total] = await this.auditRepo.findByRuleId(ruleId, skip, take);
    return {
      entries: logs.map(this.mapToDto),
      total,
    };
  }

  /**
   * Get audit trail filtered by action type.
   */
  async getByAction(
    action: string,
    skip = 0,
    take = 50,
  ): Promise<{
    entries: RuleAuditEntryDto[];
    total: number;
  }> {
    const [logs, total] = await this.auditRepo.findByAction(action, skip, take);
    return { entries: logs.map(this.mapToDto), total };
  }

  private mapToDto(log: AlertRuleAuditLog): RuleAuditEntryDto {
    return {
      id: log.id,
      ruleId: log.ruleId,
      action: log.action,
      field: log.field,
      oldValue: log.oldValue,
      newValue: log.newValue,
      version: log.version,
      performedBy: log.performedBy,
      reason: log.reason,
      correlationId: log.correlationId,
      ipAddress: log.ipAddress,
      browser: log.browser,
      timestamp: log.timestamp.toISOString(),
    };
  }
}
