import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
  IAlertRepository,
  AlertFindManyQuery,
  AlertOverviewStats,
} from "../../common/repositories/alert.repository.interface";
import {
  Alert,
  AlertHistory,
  AlertComment,
  AlertRule,
  Device,
  Prisma,
  AlertStatus,
  AlertSeverity,
  AlertCategory,
} from "@prisma/client";

@Injectable()
export class PrismaAlertRepository implements IAlertRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    incidentNumber: string;
    deviceId: string;
    ruleId?: string | null;
    parentAlertId?: string | null;
    title: string;
    description: string;
    severity: string;
    status?: string;
    category?: string;
    source?: string;
    fingerprint: string;
    riskScore?: number;
    confidenceScore?: string;
    recoveryTimerSeconds?: number | null;
    tags?: string[];
    runbookUrl?: string | null;
    assignedUserId?: string | null;
  }): Promise<Alert> {
    return this.prisma.alert.create({
      data: {
        incidentNumber: data.incidentNumber,
        deviceId: data.deviceId,
        ruleId: data.ruleId || null,
        parentAlertId: data.parentAlertId || null,
        title: data.title,
        description: data.description,
        severity: data.severity as unknown as AlertSeverity,
        status: (data.status || "NEW") as unknown as AlertStatus,
        category: (data.category || "SYSTEM") as unknown as AlertCategory,
        source: data.source || "RuleEngine",
        fingerprint: data.fingerprint,
        riskScore: data.riskScore ?? 0,
        confidenceScore: data.confidenceScore || "HIGH",
        recoveryTimerSeconds: data.recoveryTimerSeconds || null,
        tags: data.tags || [],
        runbookUrl: data.runbookUrl || null,
        assignedUserId: data.assignedUserId || null,
      } as unknown as Prisma.AlertUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<
    | (Alert & {
        rule?: AlertRule | null;
        device?: Device | null;
        comments?: AlertComment[];
        history?: AlertHistory[];
        childAlerts?: Alert[];
      })
    | null
  > {
    return this.prisma.alert.findUnique({
      where: { id },
      include: {
        rule: true,
        device: true,
        comments: { orderBy: { createdAt: "asc" }, include: { user: true } },
        history: { orderBy: { timestamp: "desc" } },
        childAlerts: true,
      },
    }) as unknown as
      | (Alert & {
          rule?: AlertRule | null;
          device?: Device | null;
          comments?: AlertComment[];
          history?: AlertHistory[];
          childAlerts?: Alert[];
        })
      | null;
  }

  async findByFingerprint(
    fingerprint: string,
    openOnly = true,
  ): Promise<Alert | null> {
    const where: Prisma.AlertWhereInput = { fingerprint };
    if (openOnly) {
      where.status = {
        in: [AlertStatus.NEW, AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED],
      };
    }
    return this.prisma.alert.findFirst({
      where,
      orderBy: { lastOccurred: "desc" },
    });
  }

  async findMany(query: AlertFindManyQuery): Promise<[Alert[], number]> {
    const where: Prisma.AlertWhereInput = {};
    if (query.status) where.status = query.status as unknown as AlertStatus;
    if (query.severity)
      where.severity = query.severity as unknown as AlertSeverity;
    if (query.category)
      where.category = query.category as unknown as AlertCategory;
    if (query.deviceId) where.deviceId = query.deviceId;
    if (query.assignedUserId) where.assignedUserId = query.assignedUserId;
    if (query.tag) where.tags = { has: query.tag };
    if (query.search) {
      where.OR = [
        { incidentNumber: { contains: query.search, mode: "insensitive" } },
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const orderBy: Prisma.AlertOrderByWithRelationInput = {};
    const sortField = query.sortBy || "createdAt";
    const sortOrder = query.sortOrder || "desc";
    orderBy[sortField] = sortOrder;

    const [data, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        skip: query.skip || 0,
        take: query.take || 20,
        orderBy,
        include: { device: true, assignedUser: true, childAlerts: true },
      }),
      this.prisma.alert.count({ where }),
    ]);

    return [data as unknown as Alert[], total];
  }

  async update(id: string, data: Partial<Alert>): Promise<Alert> {
    const updateData: Record<string, unknown> = { ...data };
    delete updateData.id;
    delete updateData.incidentNumber;
    delete updateData.createdAt;
    return this.prisma.alert.update({
      where: { id },
      data: updateData as Prisma.AlertUpdateInput,
    });
  }

  async incrementOccurrence(id: string): Promise<Alert> {
    return this.prisma.alert.update({
      where: { id },
      data: {
        occurrenceCount: { increment: 1 },
        lastOccurred: new Date(),
      },
    });
  }

  async addHistory(data: {
    alertId: string;
    action: string;
    performedBy: string;
    oldValue?: string;
    newValue?: string;
    ipAddress?: string;
    browser?: string;
    correlationId?: string;
    comment?: string;
  }): Promise<AlertHistory> {
    return this.prisma.alertHistory.create({
      data: {
        alertId: data.alertId,
        action: data.action,
        performedBy: data.performedBy,
        oldValue: data.oldValue || null,
        newValue: data.newValue || null,
        ipAddress: data.ipAddress || null,
        browser: data.browser || null,
        correlationId: data.correlationId || null,
        comment: data.comment || null,
      },
    });
  }

  async addComment(data: {
    alertId: string;
    userId: string;
    userName: string;
    comment: string;
    isPrivate?: boolean;
  }): Promise<AlertComment> {
    return this.prisma.alertComment.create({
      data: {
        alertId: data.alertId,
        userId: data.userId,
        userName: data.userName,
        comment: data.comment,
        isPrivate: data.isPrivate ?? false,
      },
    });
  }

  async findOpenByDeviceId(deviceId: string): Promise<Alert[]> {
    return this.prisma.alert.findMany({
      where: {
        deviceId,
        status: {
          in: [AlertStatus.NEW, AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED],
        },
      },
    });
  }

  async findEscalationCandidates(maxOpenMinutes: number): Promise<Alert[]> {
    const cutoff = new Date(Date.now() - maxOpenMinutes * 60 * 1000);
    return this.prisma.alert.findMany({
      where: {
        status: { in: [AlertStatus.NEW, AlertStatus.OPEN] },
        firstOccurred: { lte: cutoff },
        severity: { not: AlertSeverity.CRITICAL },
      },
    });
  }

  async getOverviewStatistics(): Promise<AlertOverviewStats> {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const [total, open, critical, warning, acked, resolvedToday, sumRepeats] =
      await Promise.all([
        this.prisma.alert.count(),
        this.prisma.alert.count({
          where: { status: { in: [AlertStatus.NEW, AlertStatus.OPEN] } },
        }),
        this.prisma.alert.count({
          where: {
            status: { in: [AlertStatus.NEW, AlertStatus.OPEN] },
            severity: AlertSeverity.CRITICAL,
          },
        }),
        this.prisma.alert.count({
          where: {
            status: { in: [AlertStatus.NEW, AlertStatus.OPEN] },
            severity: AlertSeverity.MEDIUM,
          },
        }),
        this.prisma.alert.count({
          where: { status: AlertStatus.ACKNOWLEDGED },
        }),
        this.prisma.alert.count({
          where: {
            status: AlertStatus.RESOLVED,
            resolvedAt: { gte: startOfToday },
          },
        }),
        this.prisma.alert.aggregate({ _sum: { occurrenceCount: true } }),
      ]);

    const totalOccurrences = sumRepeats._sum.occurrenceCount || 0;
    const repeated = Math.max(0, totalOccurrences - total);

    return {
      totalAlerts: total,
      openAlerts: open,
      criticalAlerts: critical,
      warningAlerts: warning,
      acknowledgedAlerts: acked,
      resolvedToday,
      repeatedIncidentCount: repeated,
    };
  }

  async bulkUpdateStatus(
    alertIds: string[],
    status: string,
    timestamp = new Date(),
  ): Promise<number> {
    const data: Prisma.AlertUpdateManyMutationInput = {
      status: status as unknown as AlertStatus,
    };
    if (status === "RESOLVED") {
      data.resolvedAt = timestamp;
    } else if (status === "ACKNOWLEDGED") {
      data.acknowledgedAt = timestamp;
    }
    const result = await this.prisma.alert.updateMany({
      where: { id: { in: alertIds } },
      data,
    });
    return result.count;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.alert.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async search(query: string, organizationId: string): Promise<Alert[]> {
    return this.prisma.alert.findMany({
      where: {
        device: { organizationId },
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { incidentNumber: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 20,
    });
  }
}
