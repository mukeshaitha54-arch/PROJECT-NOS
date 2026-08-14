import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
  IAlertRuleRepository,
  AlertRuleCreateInput,
  AlertRuleFindManyQuery,
} from "../../common/repositories/alert-rule.repository.interface";
import {
  AlertRule,
  Prisma,
  AlertSeverity,
  AlertRulePriority,
  AlertRuleCategory,
  AlertRuleStatus,
  AlertRuleScheduleMode,
} from "@prisma/client";

@Injectable()
export class PrismaAlertRuleRepository implements IAlertRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: AlertRuleCreateInput): Promise<AlertRule> {
    return this.prisma.alertRule.create({
      data: {
        version: data.version || 1,
        name: data.name,
        description: data.description || null,
        metric: data.metric,
        operator: data.operator,
        threshold: data.threshold,
        durationSeconds: data.durationSeconds ?? 0,
        severity: (data.severity || "MEDIUM") as unknown as AlertSeverity,
        priority: (data.priority || "NORMAL") as unknown as AlertRulePriority,
        category: (data.category || "SYSTEM") as unknown as AlertRuleCategory,
        ruleStatus: (data.ruleStatus || "ACTIVE") as unknown as AlertRuleStatus,
        enabled: data.enabled ?? true,
        cooldownSeconds: data.cooldownSeconds ?? 300,
        timeoutMs: data.timeoutMs ?? 500,
        scheduleMode: (data.scheduleMode ||
          "ALWAYS") as unknown as AlertRuleScheduleMode,
        cronExpression: data.cronExpression || null,
        tags: data.tags || [],
        templateName: data.templateName || null,
        silentMode: data.silentMode ?? false,
        businessHoursOnly: data.businessHoursOnly ?? false,
        dependsOnIds: data.dependsOnIds || [],
        complexityScore: data.complexityScore || "SIMPLE",
        noiseScore: data.noiseScore ?? 0,
        createdBy: data.createdBy || null,
        modifiedBy: data.modifiedBy || null,
        owner: data.owner || null,
        publishedAt: new Date(),
      },
    });
  }

  async findById(id: string): Promise<AlertRule | null> {
    return this.prisma.alertRule.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<AlertRule | null> {
    return this.prisma.alertRule.findFirst({ where: { name } });
  }

  async findMany(enabledOnly = false, metric?: string): Promise<AlertRule[]> {
    const where: Prisma.AlertRuleWhereInput = {
      ruleStatus: { not: AlertRuleStatus.ARCHIVED },
    };
    if (enabledOnly) where.enabled = true;
    if (metric) where.metric = metric;
    return this.prisma.alertRule.findMany({
      where,
      orderBy: [{ priority: "desc" }, { name: "asc" }],
    });
  }

  async findManyPaginated(
    query: AlertRuleFindManyQuery,
  ): Promise<[AlertRule[], number]> {
    const where: Prisma.AlertRuleWhereInput = {};
    if (query.enabledOnly) where.enabled = true;
    if (query.enabled !== undefined) where.enabled = query.enabled;
    if (query.metric)
      where.metric = { contains: query.metric, mode: "insensitive" };
    if (query.severity)
      where.severity = query.severity as unknown as AlertSeverity;
    if (query.category)
      where.category = query.category as unknown as AlertRuleCategory;
    if (query.ruleStatus)
      where.ruleStatus = query.ruleStatus as unknown as AlertRuleStatus;
    if (query.priority)
      where.priority = query.priority as unknown as AlertRulePriority;
    if (query.owner)
      where.owner = { contains: query.owner, mode: "insensitive" };
    if (query.version !== undefined) where.version = query.version;
    if (query.tags && query.tags.length > 0) {
      where.tags = { hasSome: query.tags };
    }
    if (query.name) {
      where.name = { contains: query.name, mode: "insensitive" };
    }

    const [data, total] = await Promise.all([
      this.prisma.alertRule.findMany({
        where,
        skip: query.skip ?? 0,
        take: query.take ?? 50,
        orderBy: [{ priority: "desc" }, { name: "asc" }],
      }),
      this.prisma.alertRule.count({ where }),
    ]);

    return [data, total];
  }

  async update(id: string, data: Partial<AlertRule>): Promise<AlertRule> {
    const updateData: Record<string, unknown> = { ...data };
    delete updateData.id;
    delete updateData.createdAt;
    return this.prisma.alertRule.update({
      where: { id },
      data: updateData as Prisma.AlertRuleUpdateInput,
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.alertRule.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async archive(id: string, performedBy: string): Promise<AlertRule> {
    return this.prisma.alertRule.update({
      where: { id },
      data: {
        ruleStatus: AlertRuleStatus.ARCHIVED,
        enabled: false,
        archivedAt: new Date(),
        modifiedBy: performedBy,
      },
    });
  }

  async clone(
    id: string,
    newName: string,
    performedBy: string,
  ): Promise<AlertRule> {
    const source = await this.prisma.alertRule.findUniqueOrThrow({
      where: { id },
    });
    return this.prisma.alertRule.create({
      data: {
        version: 1,
        name: newName,
        description: source.description
          ? `Clone of: ${source.description}`
          : `Cloned from "${source.name}"`,
        metric: source.metric,
        operator: source.operator,
        threshold: source.threshold,
        durationSeconds: source.durationSeconds,
        severity: source.severity,
        priority: source.priority,
        category: source.category,
        ruleStatus: AlertRuleStatus.ACTIVE,
        enabled: false, // Clones start disabled — operator must review and enable
        cooldownSeconds: source.cooldownSeconds,
        timeoutMs: source.timeoutMs,
        scheduleMode: source.scheduleMode,
        cronExpression: source.cronExpression,
        tags: source.tags,
        templateName: source.templateName,
        silentMode: source.silentMode,
        businessHoursOnly: source.businessHoursOnly,
        dependsOnIds: source.dependsOnIds,
        complexityScore: source.complexityScore,
        noiseScore: source.noiseScore,
        createdBy: performedBy,
        modifiedBy: performedBy,
        owner: performedBy,
        publishedAt: new Date(),
      },
    });
  }

  async incrementVersion(id: string, modifier: string): Promise<AlertRule> {
    return this.prisma.alertRule.update({
      where: { id },
      data: {
        version: { increment: 1 },
        modifiedBy: modifier,
        publishedAt: new Date(),
      },
    });
  }

  async updatePerformanceMetrics(
    id: string,
    metrics: {
      execMs: number;
      triggered: boolean;
      suppressed?: boolean;
      deduplicated?: boolean;
      escalated?: boolean;
    },
  ): Promise<void> {
    const current = await this.prisma.alertRule.findUnique({
      where: { id },
      select: {
        evaluationCount: true,
        avgExecMs: true,
        maxExecMs: true,
        minExecMs: true,
      },
    });
    if (!current) return;

    const evalCount = Number(current.evaluationCount);
    const currentAvg = current.avgExecMs;
    const newAvg =
      evalCount === 0
        ? metrics.execMs
        : (currentAvg * evalCount + metrics.execMs) / (evalCount + 1);

    await this.prisma.alertRule.update({
      where: { id },
      data: {
        evaluationCount: { increment: 1 },
        triggerCount: metrics.triggered ? { increment: 1 } : undefined,
        suppressionCount: metrics.suppressed ? { increment: 1 } : undefined,
        deduplicationCount: metrics.deduplicated ? { increment: 1 } : undefined,
        escalationCount: metrics.escalated ? { increment: 1 } : undefined,
        avgExecMs: newAvg,
        maxExecMs:
          metrics.execMs > (current.maxExecMs || 0)
            ? metrics.execMs
            : undefined,
        minExecMs:
          current.minExecMs === 0 || metrics.execMs < current.minExecMs
            ? metrics.execMs
            : undefined,
        lastEvaluatedAt: new Date(),
      },
    });
  }

  async findConflicting(): Promise<
    Array<{ ruleIds: string[]; reason: string }>
  > {
    // Detect rules with same metric and overlapping threshold ranges
    const rules = await this.prisma.alertRule.findMany({
      where: { ruleStatus: { not: AlertRuleStatus.ARCHIVED }, enabled: true },
      select: {
        id: true,
        name: true,
        metric: true,
        operator: true,
        threshold: true,
        severity: true,
      },
    });

    const conflicts: Array<{ ruleIds: string[]; reason: string }> = [];
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const a = rules[i];
        const b = rules[j];
        if (
          a.metric === b.metric &&
          a.operator === b.operator &&
          a.threshold === b.threshold &&
          a.severity !== b.severity
        ) {
          conflicts.push({
            ruleIds: [a.id, b.id],
            reason: `Rules "${a.name}" and "${b.name}" have identical conditions (${a.metric} ${a.operator} ${a.threshold}) but different severities`,
          });
        }
      }
    }
    return conflicts;
  }

  async findDuplicates(): Promise<
    Array<{ ruleIds: string[]; reason: string }>
  > {
    const rules = await this.prisma.alertRule.findMany({
      where: { ruleStatus: { not: AlertRuleStatus.ARCHIVED } },
      select: {
        id: true,
        name: true,
        metric: true,
        operator: true,
        threshold: true,
        durationSeconds: true,
        severity: true,
      },
    });

    const duplicates: Array<{ ruleIds: string[]; reason: string }> = [];
    const seen = new Map<string, string>();

    for (const rule of rules) {
      const key = `${rule.metric}:${rule.operator}:${rule.threshold}:${rule.durationSeconds}:${rule.severity}`;
      if (seen.has(key)) {
        const existingId = seen.get(key)!;
        const existing = rules.find((r) => r.id === existingId);
        duplicates.push({
          ruleIds: [existingId, rule.id],
          reason: `Rule "${rule.name}" is a duplicate of "${existing?.name}" (same metric, operator, threshold, duration, severity)`,
        });
      } else {
        seen.set(key, rule.id);
      }
    }
    return duplicates;
  }

  async findByIds(ids: string[]): Promise<AlertRule[]> {
    return this.prisma.alertRule.findMany({ where: { id: { in: ids } } });
  }

  async getCategories(): Promise<string[]> {
    const results = await this.prisma.alertRule.findMany({
      select: { category: true },
      distinct: ["category"],
    });
    return results.map((r) => r.category as string);
  }

  async getTags(): Promise<string[]> {
    const results = await this.prisma.alertRule.findMany({
      select: { tags: true },
    });
    const tagSet = new Set<string>();
    for (const r of results) {
      for (const t of r.tags) tagSet.add(t);
    }
    return Array.from(tagSet).sort();
  }
}
