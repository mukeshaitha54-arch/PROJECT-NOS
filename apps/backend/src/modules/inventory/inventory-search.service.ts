import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface InventorySearchParams {
  tenantId: string;
  query: string;
  category: string;
  deviceId?: string;
  page: number;
  limit: number;
}

@Injectable()
export class InventorySearchService {
  private readonly logger = new Logger(InventorySearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(params: InventorySearchParams) {
    const { tenantId, query, category, deviceId, page, limit } = params;
    const skip = (page - 1) * limit;

    const tenantFilter: any =
      tenantId && tenantId !== "default-org"
        ? { organizationId: tenantId }
        : {};

    if (category === "SERVICES") {
      const where: any = {};
      where.deviceInventory = {
        device: { ...tenantFilter, ...(deviceId ? { id: deviceId } : {}) },
      };
      if (query) {
        where.OR = [
          { serviceName: { contains: query, mode: "insensitive" } },
          { displayName: { contains: query, mode: "insensitive" } },
        ];
      }

      const [total, items] = await Promise.all([
        this.prisma.windowsService.count({ where }),
        this.prisma.windowsService.findMany({
          where,
          skip,
          take: limit,
          include: { deviceInventory: { include: { device: true } } },
        }),
      ]);

      const data = items.map((i) => ({
        id: i.id,
        deviceId: i.deviceInventory?.deviceId,
        hostname: i.deviceInventory?.device?.hostname || "Unknown",
        serviceName: i.serviceName,
        displayName: i.displayName,
        status: i.status,
        startType: i.startType,
        osEdition: i.deviceInventory?.device?.os || "Unknown",
      }));

      return { success: true, data, meta: { total, page, limit } };
    } else if (category === "SECURITY") {
      const where: any = {
        ...tenantFilter,
        ...(deviceId ? { id: deviceId } : {}),
      };
      if (query) {
        where.hostname = { contains: query, mode: "insensitive" };
      }
      where.inventory = { isNot: null };

      const [total, devices] = await Promise.all([
        this.prisma.device.count({ where }),
        this.prisma.device.findMany({
          where,
          skip,
          take: limit,
          include: { inventory: { include: { security: true } } },
        }),
      ]);

      const data = devices
        .filter((d) => d.inventory?.security)
        .map((d) => ({
          id: d.inventory!.security!.id,
          deviceId: d.id,
          hostname: d.hostname,
          defenderEnabled: d.inventory!.security!.windowsDefenderEnabled,
          firewallEnabled: d.inventory!.security!.firewallEnabled,
          bitLockerStatus: d.inventory!.security!.bitLockerEnabled
            ? "Enabled"
            : "Disabled",
          tpmVersion: d.inventory!.security!.tpmVersion,
          osEdition: d.os || "Unknown",
        }));

      return { success: true, data, meta: { total: data.length, page, limit } };
    } else if (category === "CHANGES") {
      const where: any = { ...(deviceId ? { deviceId } : {}) };
      if (query) {
        where.changeDetails = { contains: query, mode: "insensitive" };
      }

      const [total, items] = await Promise.all([
        this.prisma.inventoryAuditLog.count({ where }),
        this.prisma.inventoryAuditLog.findMany({
          where,
          orderBy: { timestamp: "desc" },
          skip,
          take: limit,
          include: { device: true },
        }),
      ]);

      const data = items.map((i) => ({
        id: i.id,
        deviceId: i.deviceId,
        hostname: i.device?.hostname || "Unknown",
        action: i.action,
        details: i.changeDetails,
        timestamp: i.timestamp,
        osEdition: i.device?.os || "Unknown",
      }));

      return { success: true, data, meta: { total, page, limit } };
    } else {
      // Default: SOFTWARE
      const where: any = {};
      where.deviceInventory = {
        device: { ...tenantFilter, ...(deviceId ? { id: deviceId } : {}) },
      };
      if (query) {
        where.OR = [
          { name: { contains: query, mode: "insensitive" } },
          { publisher: { contains: query, mode: "insensitive" } },
          { version: { contains: query, mode: "insensitive" } },
        ];
      }

      const [total, items] = await Promise.all([
        this.prisma.installedSoftware.count({ where }),
        this.prisma.installedSoftware.findMany({
          where,
          skip,
          take: limit,
          include: { deviceInventory: { include: { device: true } } },
        }),
      ]);

      const data = items.map((i) => ({
        id: i.id,
        deviceId: i.deviceInventory?.deviceId,
        hostname: i.deviceInventory?.device?.hostname || "Unknown",
        softwareName: i.name,
        publisher: i.publisher || "Unknown",
        version: i.version || "0.0.0",
        installDate: i.installDate,
        osEdition: i.deviceInventory?.device?.os || "Unknown",
      }));

      return { success: true, data, meta: { total, page, limit } };
    }
  }
}
