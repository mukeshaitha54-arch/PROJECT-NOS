import { Injectable } from "@nestjs/common";
import { Device, DeviceStatus } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import {
  IDeviceRepository,
  CreateDeviceInput,
  UpdateDeviceInput,
} from "../../common/repositories/device.repository.interface";

@Injectable()
export class PrismaDeviceRepository implements IDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Device | null> {
    return this.prisma.device.findUnique({ where: { id } });
  }

  async findByUuid(uuid: string): Promise<Device | null> {
    return this.prisma.device.findUnique({ where: { uuid } });
  }

  async findByTokenHash(tokenHash: string): Promise<Device | null> {
    return this.prisma.device.findUnique({ where: { tokenHash } });
  }

  async findAll(organizationId?: string): Promise<Device[]> {
    const where =
      organizationId && organizationId !== "default-org"
        ? { organizationId }
        : {};
    return this.prisma.device.findMany({
      where,
      orderBy: { lastSeen: "desc" },
    });
  }

  async countByOrganization(organizationId?: string): Promise<number> {
    const where =
      organizationId && organizationId !== "default-org"
        ? { organizationId }
        : {};
    return this.prisma.device.count({ where });
  }

  async create(data: CreateDeviceInput): Promise<Device> {
    let resolvedOrgId: string | undefined = undefined;
    if (data.organizationId) {
      const orgExists = await this.prisma.organization.findUnique({
        where: { id: data.organizationId },
      });
      if (orgExists) {
        resolvedOrgId = orgExists.id;
      } else {
        const firstOrg = await this.prisma.organization.findFirst();
        if (firstOrg) {
          resolvedOrgId = firstOrg.id;
        } else {
          try {
            const defaultOrg = await this.prisma.organization.create({
              data: {
                id:
                  data.organizationId === "default-org"
                    ? "default-org"
                    : undefined,
                name: "Personal Workspace",
                slug: "personal",
                status: "ACTIVE",
              },
            });
            resolvedOrgId = defaultOrg.id;
          } catch {
            const fallback = await this.prisma.organization.findFirst();
            resolvedOrgId = fallback?.id;
          }
        }
      }
    }

    return this.prisma.device.create({
      data: {
        uuid: data.uuid,
        hostname: data.hostname,
        deviceName: data.deviceName,
        os: data.os,
        osVersion: data.osVersion,
        architecture: data.architecture,
        agentVersion: data.agentVersion,
        status: data.status || DeviceStatus.ONLINE,
        organizationId: resolvedOrgId,
        tokenHash: data.tokenHash,
        lastSeen: data.lastSeen || new Date(),
      },
    });
  }

  async update(id: string, data: UpdateDeviceInput): Promise<Device> {
    let updateData = { ...data };
    if (updateData.organizationId) {
      const orgExists = await this.prisma.organization.findUnique({
        where: { id: updateData.organizationId },
      });
      if (!orgExists) {
        delete updateData.organizationId;
      }
    }
    return this.prisma.device.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.device.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async countByStatus(): Promise<Record<DeviceStatus, number>> {
    const counts = await this.prisma.device.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    const result: Record<DeviceStatus, number> = {
      [DeviceStatus.ONLINE]: 0,
      [DeviceStatus.OFFLINE]: 0,
      [DeviceStatus.DEGRADED]: 0,
      [DeviceStatus.CRITICAL]: 0,
      [DeviceStatus.MAINTENANCE]: 0,
    };

    for (const item of counts) {
      result[item.status] = item._count.status;
    }

    return result;
  }

  async search(query: string, organizationId: string): Promise<Device[]> {
    return this.prisma.device.findMany({
      where: {
        organizationId,
        OR: [
          { hostname: { contains: query, mode: "insensitive" } },
          { deviceName: { contains: query, mode: "insensitive" } },
          { uuid: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 20,
    });
  }
}
