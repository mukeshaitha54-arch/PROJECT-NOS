import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { IUserSessionRepository } from "../../common/repositories/tenant.repository.interface";
import { UserSessionDto, UserActivityDto } from "@nos/shared-types";
import { UserSession, Prisma } from "@prisma/client";

@Injectable()
export class PrismaUserSessionRepository implements IUserSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapSession(s: UserSession): UserSessionDto {
    return {
      id: s.id,
      userId: s.userId,
      organizationId: s.organizationId,
      tokenHash: s.tokenHash,
      ipAddress: s.ipAddress,
      browser: s.browser,
      os: s.os || "Unknown",
      isActive: s.isActive,
      isRevoked: s.isRevoked,
      lastUsedAt: s.lastUsedAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      riskScore: s.riskScore || 0,
    };
  }

  async create(data: {
    userId: string;
    organizationId: string;
    tokenHash: string;
    ipAddress: string;
    browser: string;
    os: string;
    expiresAt: Date;
    riskScore?: number;
  }): Promise<UserSessionDto> {
    const s = await this.prisma.userSession.create({
      data: {
        userId: data.userId,
        organizationId: data.organizationId,
        tokenHash: data.tokenHash,
        ipAddress: data.ipAddress,
        browser: data.browser,
        os: data.os,
        expiresAt: data.expiresAt,
        riskScore: data.riskScore || 0,
        isActive: true,
        isRevoked: false,
      },
    });
    return this.mapSession(s);
  }

  async listActiveSessions(
    organizationId: string,
    userId?: string,
  ): Promise<UserSessionDto[]> {
    const where: Prisma.UserSessionWhereInput = {
      organizationId,
      isActive: true,
      isRevoked: false,
    };
    if (userId) {
      where.userId = userId;
    }
    const list = await this.prisma.userSession.findMany({
      where,
      orderBy: { lastUsedAt: "desc" },
    });
    return list.map((s) => this.mapSession(s));
  }

  async revokeSession(id: string, organizationId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { id, organizationId },
      data: { isActive: false, isRevoked: true },
    });
  }

  async revokeAllUserSessions(
    userId: string,
    organizationId?: string,
  ): Promise<void> {
    const where: Prisma.UserSessionWhereInput = { userId };
    if (organizationId) where.organizationId = organizationId;
    await this.prisma.userSession.updateMany({
      where,
      data: { isActive: false, isRevoked: true },
    });
  }

  async recordActivity(
    data: Omit<UserActivityDto, "id" | "timestamp">,
  ): Promise<void> {
    await this.prisma.userActivity.create({
      data: {
        userId: data.userId,
        organizationId: data.organizationId,
        action: data.action,
        resourceType: data.resourceType || null,
        resourceId: data.resourceId || null,
        ipAddress: data.ipAddress,
        browser: data.browser,
      },
    });
  }

  async listUserActivities(
    organizationId: string,
    userId?: string,
    limit = 50,
  ): Promise<UserActivityDto[]> {
    const where: Prisma.UserActivityWhereInput = { organizationId };
    if (userId) where.userId = userId;
    const list = await this.prisma.userActivity.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit,
    });
    return list.map((a) => ({
      id: a.id,
      userId: a.userId,
      organizationId: a.organizationId,
      action: a.action,
      resourceType: a.resourceType || undefined,
      resourceId: a.resourceId || undefined,
      ipAddress: a.ipAddress,
      browser: a.browser,
      timestamp: a.timestamp.toISOString(),
    }));
  }
}
