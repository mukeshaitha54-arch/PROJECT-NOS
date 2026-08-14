import { AlertRuleAuditLog } from "@prisma/client";

export interface AlertRuleAuditCreateInput {
  ruleId: string;
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  version: number;
  performedBy: string;
  reason?: string | null;
  correlationId?: string | null;
  ipAddress?: string | null;
  browser?: string | null;
}

export interface IAlertRuleAuditRepository {
  create(data: AlertRuleAuditCreateInput): Promise<AlertRuleAuditLog>;
  findByRuleId(
    ruleId: string,
    skip?: number,
    take?: number,
  ): Promise<[AlertRuleAuditLog[], number]>;
  findByAction(
    action: string,
    skip?: number,
    take?: number,
  ): Promise<[AlertRuleAuditLog[], number]>;
  findByPerformedBy(
    performedBy: string,
    skip?: number,
    take?: number,
  ): Promise<[AlertRuleAuditLog[], number]>;
}

export const IAlertRuleAuditRepository = Symbol("IAlertRuleAuditRepository");
