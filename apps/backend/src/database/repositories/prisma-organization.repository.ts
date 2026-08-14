import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { IOrganizationRepository } from "../../common/repositories/tenant.repository.interface";
import {
  OrganizationDto,
  OrganizationStatus,
  OrganizationSettingsDto,
  OrganizationQuotaDto,
} from "@nos/shared-types";
import { Organization, OrganizationQuota, Prisma } from "@prisma/client";

@Injectable()
export class PrismaOrganizationRepository implements IOrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDefaultSettings(): OrganizationSettingsDto {
    return {
      timezone: "UTC",
      language: "en-US",
      retentionDays: 90,
      notificationDefaults: {
        emailEnabled: true,
        webhookEnabled: false,
      },
      maintenanceDefaults: {
        defaultDurationMinutes: 120,
        requireApproval: true,
        autoNotify: true,
      },
      securityPolicies: {
        enforceMfa: true,
        sessionTimeoutMinutes: 60,
        maxFailedLoginAttempts: 5,
        allowedIpRanges: [],
      },
      passwordPolicies: {
        minLength: 12,
        requireUppercase: true,
        requireNumbers: true,
        requireSymbols: true,
        expiryDays: 90,
      },
    };
  }

  private getDefaultQuota(): OrganizationQuotaDto {
    return {
      maxDevices: 50,
      maxUsers: 10,
      maxApiKeys: 10,
      maxStorageMb: 1024,
      maxDailyTelemetry: 100000,
      maxDailyAlerts: 5000,
    };
  }

  private mapEntity(
    org: Organization & { quota?: OrganizationQuota | null },
  ): OrganizationDto {
    const settings = this.getDefaultSettings();
    const quota = org.quota
      ? {
          maxDevices: org.quota.maxDevices,
          maxUsers: org.quota.maxUsers,
          maxApiKeys: org.quota.maxApiKeys,
          maxStorageMb: org.quota.maxStorageMb,
          maxDailyTelemetry: org.quota.maxDailyTelemetry,
          maxDailyAlerts: org.quota.maxDailyAlerts,
        }
      : this.getDefaultQuota();

    const quotaUsage = org.quota
      ? {
          ...quota,
          currentDevices: org.quota.currentDevices,
          currentUsers: org.quota.currentUsers,
          currentApiKeys: org.quota.currentApiKeys,
          currentStorageMb: org.quota.currentStorageMb,
          currentDailyTelemetry: org.quota.currentDailyTelemetry,
          currentDailyAlerts: org.quota.currentDailyAlerts,
          isApproachingLimit:
            org.quota.currentDevices / org.quota.maxDevices > 0.8,
          isLimitExceeded: org.quota.currentDevices >= org.quota.maxDevices,
          percentUsed: Math.min(
            100,
            Math.round((org.quota.currentDevices / org.quota.maxDevices) * 100),
          ),
        }
      : undefined;

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: (org.status as OrganizationStatus) || OrganizationStatus.ACTIVE,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
      deletedAt: org.deletedAt ? org.deletedAt.toISOString() : null,
      settings,
      quota,
      quotaUsage,
    };
  }

  async findById(id: string): Promise<OrganizationDto | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { quota: true },
    });
    if (!org) return null;
    return this.mapEntity(org);
  }

  async findBySlug(slug: string): Promise<OrganizationDto | null> {
    const org = await this.prisma.organization.findUnique({
      where: { slug: slug.toLowerCase() },
      include: { quota: true },
    });
    if (!org) return null;
    return this.mapEntity(org);
  }

  async create(data: {
    name: string;
    slug: string;
    status?: OrganizationStatus;
    settings?: Partial<OrganizationSettingsDto>;
    quota?: Partial<OrganizationQuotaDto>;
  }): Promise<OrganizationDto> {
    const settings = { ...this.getDefaultSettings(), ...data.settings };
    const quotaDefaults = { ...this.getDefaultQuota(), ...data.quota };

    const created = await this.prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug.toLowerCase(),
        status: data.status || OrganizationStatus.ACTIVE,

        quota: {
          create: {
            maxDevices: quotaDefaults.maxDevices,
            maxUsers: quotaDefaults.maxUsers,
            maxApiKeys: quotaDefaults.maxApiKeys,
            maxStorageMb: quotaDefaults.maxStorageMb,
            maxDailyTelemetry: quotaDefaults.maxDailyTelemetry,
            maxDailyAlerts: quotaDefaults.maxDailyAlerts,
          },
        },
      },
      include: { quota: true },
    });

    return this.mapEntity(created);
  }

  async updateStatus(
    id: string,
    status: OrganizationStatus,
  ): Promise<OrganizationDto> {
    const updated = await this.prisma.organization.update({
      where: { id },
      data: { status },
      include: { quota: true },
    });
    return this.mapEntity(updated);
  }

  async updateSettings(id: string, settings: any): Promise<OrganizationDto> {
    const updated = await this.prisma.organization.update({
      where: { id },
      data: { timezone: settings?.timezone || "UTC" },
      include: { quota: true },
    });
    return this.mapEntity(updated);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id },
      data: {
        status: OrganizationStatus.DELETED,
        deletedAt: new Date(),
      },
    });
  }

  async restore(id: string): Promise<OrganizationDto> {
    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        status: OrganizationStatus.ACTIVE,
        deletedAt: null,
      },
      include: { quota: true },
    });
    return this.mapEntity(updated);
  }

  async listAll(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: OrganizationDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 ? params.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrganizationWhereInput = {};
    if (params?.status) {
      where.status = params.status;
    } else {
      where.status = { not: OrganizationStatus.DELETED };
    }
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { slug: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: { quota: true },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
      items: rows.map((r) => this.mapEntity(r)),
      total,
      page,
      totalPages,
    };
  }

  async getQuota(organizationId: string): Promise<OrganizationQuotaDto | null> {
    const q = await this.prisma.organizationQuota.findUnique({
      where: { organizationId },
    });
    if (!q) return null;
    return {
      maxDevices: q.maxDevices,
      maxUsers: q.maxUsers,
      maxApiKeys: q.maxApiKeys,
      maxStorageMb: q.maxStorageMb,
      maxDailyTelemetry: q.maxDailyTelemetry,
      maxDailyAlerts: q.maxDailyAlerts,
    };
  }

  async updateQuota(
    organizationId: string,
    quota: Partial<OrganizationQuotaDto>,
  ): Promise<OrganizationQuotaDto> {
    const q = await this.prisma.organizationQuota.upsert({
      where: { organizationId },
      update: { ...quota },
      create: {
        organizationId,
        ...this.getDefaultQuota(),
        ...quota,
      },
    });
    return {
      maxDevices: q.maxDevices,
      maxUsers: q.maxUsers,
      maxApiKeys: q.maxApiKeys,
      maxStorageMb: q.maxStorageMb,
      maxDailyTelemetry: q.maxDailyTelemetry,
      maxDailyAlerts: q.maxDailyAlerts,
    };
  }
}
