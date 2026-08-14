import { AlertRule } from "@prisma/client";

export interface AlertRuleCreateInput {
  version?: number;
  name: string;
  description?: string | null;
  metric: string;
  operator: string;
  threshold: number;
  durationSeconds?: number;
  severity?: string;
  priority?: string;
  category?: string;
  ruleStatus?: string;
  enabled?: boolean;
  cooldownSeconds?: number;
  timeoutMs?: number;
  scheduleMode?: string;
  cronExpression?: string | null;
  tags?: string[];
  templateName?: string | null;
  silentMode?: boolean;
  businessHoursOnly?: boolean;
  dependsOnIds?: string[];
  complexityScore?: string;
  noiseScore?: number;
  createdBy?: string | null;
  modifiedBy?: string | null;
  owner?: string | null;
}

export interface AlertRuleFindManyQuery {
  name?: string;
  metric?: string;
  severity?: string;
  category?: string;
  tags?: string[];
  enabled?: boolean;
  owner?: string;
  version?: number;
  ruleStatus?: string;
  priority?: string;
  enabledOnly?: boolean;
  skip?: number;
  take?: number;
}

export interface IAlertRuleRepository {
  create(data: AlertRuleCreateInput): Promise<AlertRule>;
  findById(id: string): Promise<AlertRule | null>;
  findByName(name: string): Promise<AlertRule | null>;
  findMany(enabledOnly?: boolean, metric?: string): Promise<AlertRule[]>;
  findManyPaginated(
    query: AlertRuleFindManyQuery,
  ): Promise<[AlertRule[], number]>;
  update(id: string, data: Partial<AlertRule>): Promise<AlertRule>;
  delete(id: string): Promise<boolean>;
  archive(id: string, performedBy: string): Promise<AlertRule>;
  clone(id: string, newName: string, performedBy: string): Promise<AlertRule>;
  incrementVersion(id: string, modifier: string): Promise<AlertRule>;
  updatePerformanceMetrics(
    id: string,
    metrics: {
      execMs: number;
      triggered: boolean;
      suppressed?: boolean;
      deduplicated?: boolean;
      escalated?: boolean;
    },
  ): Promise<void>;
  findConflicting(): Promise<Array<{ ruleIds: string[]; reason: string }>>;
  findDuplicates(): Promise<Array<{ ruleIds: string[]; reason: string }>>;
  findByIds(ids: string[]): Promise<AlertRule[]>;
  getCategories(): Promise<string[]>;
  getTags(): Promise<string[]>;
}

export const IAlertRuleRepository = Symbol("IAlertRuleRepository");
