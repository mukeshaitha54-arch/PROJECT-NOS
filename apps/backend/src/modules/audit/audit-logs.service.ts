import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditLogQueryParams {
  tenantId: string;
  action?: string;
  actor?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAuditLogs(params: AuditLogQueryParams) {
    const { tenantId, action, actor, startDate, endDate, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (tenantId && tenantId !== "default-org") {
      where.organizationId = tenantId;
    }

    if (action) {
      where.action = { contains: action, mode: "insensitive" };
    }

    if (actor) {
      where.OR = [
        { userId: { contains: actor, mode: "insensitive" } },
        { userEmail: { contains: actor, mode: "insensitive" } },
      ];
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        const parsedStart = new Date(startDate);
        if (!isNaN(parsedStart.getTime())) {
          where.timestamp.gte = parsedStart;
        }
      }
      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (!isNaN(parsedEnd.getTime())) {
          where.timestamp.lte = parsedEnd;
        }
      }
      if (Object.keys(where.timestamp).length === 0) {
        delete where.timestamp;
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const data = items.map((item) => ({
      ...item,
      createdAt: item.timestamp,
      actor: item.userEmail || item.userId || "System",
    }));

    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async log(params: {
    action: string;
    actor: string;
    target?: string;
    details?: any;
    tenantId?: string;
    organizationId?: string;
  }): Promise<void> {
    try {
      const orgId = params.tenantId || params.organizationId || "default-org";
      await this.prisma.auditLog.create({
        data: {
          organizationId: orgId,
          userId: params.actor,
          userEmail: params.actor,
          action: params.action,
          resourceType: "ALERT_ENGINE",
          resourceId: params.target,
          ipAddress: "127.0.0.1",
          browser: "Alert Rule Engine",
          details: params.details || {},
        },
      });
    } catch (err) {
      this.logger.error(
        `Error logging action ${params.action}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async logAction(params: {
    action: string;
    actor: string;
    target?: string;
    details?: any;
    tenantId?: string;
    organizationId?: string;
  }): Promise<void> {
    return this.log(params);
  }
}
