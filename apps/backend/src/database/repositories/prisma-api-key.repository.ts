import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { IApiKeyRepository } from "../../common/repositories/tenant.repository.interface";
import {
  ApiKeyDto,
  ApiKeyCreateRequestDto,
  ApiKeyScope,
} from "@nos/shared-types";
import { ApiKey, Prisma } from "@prisma/client";

@Injectable()
export class PrismaApiKeyRepository implements IApiKeyRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapEntity(entity: ApiKey): ApiKeyDto {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      name: entity.name,
      keyPrefix: entity.keyPrefix,
      tokenHash: entity.tokenHash,
      scopes: (entity.scopes as ApiKeyScope[]) || [],
      allowedIps: entity.allowedIps || [],
      expiresAt: entity.expiresAt.toISOString(),
      lastUsedAt: entity.lastUsedAt ? entity.lastUsedAt.toISOString() : null,
      usageCount: entity.usageCount || 0,
      createdByUserId: entity.createdByUserId,
      isRevoked: entity.isRevoked,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  async create(
    organizationId: string,
    createdByUserId: string,
    data: ApiKeyCreateRequestDto,
    keyPrefix: string,
    tokenHash: string,
  ): Promise<ApiKeyDto> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.expiryDays || 90));

    const created = await this.prisma.apiKey.create({
      data: {
        organizationId,
        name: data.name,
        keyPrefix,
        tokenHash,
        scopes: data.scopes as unknown as string[],
        allowedIps: data.allowedIps || [],
        expiresAt,
        createdByUserId,
        isRevoked: false,
      },
    });
    return this.mapEntity(created);
  }

  async findByTokenHash(tokenHash: string): Promise<ApiKeyDto | null> {
    const key = await this.prisma.apiKey.findUnique({
      where: { tokenHash },
    });
    if (!key || key.isRevoked) return null;
    return this.mapEntity(key);
  }

  async listByOrganization(
    organizationId: string,
    params?: { page?: number; limit?: number; search?: string },
  ): Promise<{ items: ApiKeyDto[]; total: number }> {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 ? params.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ApiKeyWhereInput = { organizationId, isRevoked: false };
    if (params?.search) {
      where.name = { contains: params.search, mode: "insensitive" };
    }

    const [total, rows] = await Promise.all([
      this.prisma.apiKey.count({ where }),
      this.prisma.apiKey.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      items: rows.map((r) => this.mapEntity(r)),
      total,
    };
  }

  async revoke(organizationId: string, id: string): Promise<void> {
    await this.prisma.apiKey.updateMany({
      where: { id, organizationId },
      data: { isRevoked: true },
    });
  }

  async recordUsage(id: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    });
  }
}
