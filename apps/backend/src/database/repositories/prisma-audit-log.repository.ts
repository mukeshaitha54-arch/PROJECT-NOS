import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { IAuditLogRepository } from "../../common/repositories/tenant.repository.interface";
import {
  AuditLogDto,
  AuditSearchRequestDto,
  AuditSearchResultDto,
  AuditActionType,
} from "@nos/shared-types";
import { AuditLog, Prisma } from "@prisma/client";

@Injectable()
export class PrismaAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapLog(log: AuditLog): AuditLogDto {
    return {
      id: log.id,
      organizationId: log.organizationId,
      userId: log.userId || null,
      userEmail: log.userEmail || null,
      action: log.action as AuditActionType,
      resourceType: log.resourceType || null,
      resourceId: log.resourceId || null,
      reason: log.reason || null,
      ipAddress: log.ipAddress,
      browser: log.browser,
      correlationId: log.correlationId,
      details: log.details
        ? (log.details as Record<string, unknown>)
        : undefined,
      timestamp: log.timestamp.toISOString(),
    };
  }

  async record(
    data: Omit<AuditLogDto, "id" | "timestamp">,
  ): Promise<AuditLogDto> {
    const created = await this.prisma.auditLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        action: data.action as string,
        resourceType: data.resourceType || null,
        resourceId: data.resourceId || null,
        reason: data.reason || null,
        ipAddress: data.ipAddress,
        browser: data.browser,
        correlationId: data.correlationId,
        details: data.details
          ? (data.details as unknown as Prisma.InputJsonValue)
          : null,
      },
    });
    return this.mapLog(created);
  }

  async search(request: AuditSearchRequestDto): Promise<AuditSearchResultDto> {
    const page = request.page && request.page > 0 ? request.page : 1;
    const limit = request.limit && request.limit > 0 ? request.limit : 20;
    const skip = (page - 1) * limit;

    const andClauses: Prisma.AuditLogWhereInput[] = [];

    if (request.organizationId) {
      andClauses.push({ organizationId: request.organizationId });
    }
    if (request.action) {
      andClauses.push({ action: request.action });
    }
    if (request.resourceType) {
      andClauses.push({ resourceType: request.resourceType });
    }
    if (request.from || request.to) {
      const timeFilter: any = {};
      if (request.from) timeFilter.gte = new Date(request.from);
      if (request.to) timeFilter.lte = new Date(request.to);
      andClauses.push({ timestamp: timeFilter });
    }

    const userConditions: Prisma.AuditLogWhereInput[] = [];
    if (request.userId) {
      userConditions.push({ userId: request.userId });
    }
    if ((request as any).userEmail) {
      userConditions.push({ userEmail: (request as any).userEmail });
    }
    if (userConditions.length > 0) {
      andClauses.push({ OR: userConditions });
    }

    if (request.search) {
      andClauses.push({
        OR: [
          { action: { contains: request.search, mode: "insensitive" } },
          { userEmail: { contains: request.search, mode: "insensitive" } },
          { reason: { contains: request.search, mode: "insensitive" } },
          { correlationId: { contains: request.search, mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.AuditLogWhereInput =
      andClauses.length > 0 ? { AND: andClauses } : {};

    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: "desc" },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items: rows.map((r) => this.mapLog(r)),
      total,
      page,
      totalPages,
      limit,
    };
  }
}
