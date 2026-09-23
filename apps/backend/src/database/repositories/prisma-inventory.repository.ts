import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
  IInventoryRepository,
  InventoryAuditAction,
} from "../../common/repositories/inventory.repository.interface";
import {
  SubmitInventoryPayload,
  DeviceInventoryDto,
  HardwareInventoryResponse,
  SoftwareInventoryResponse,
  NetworkInventoryResponse,
  SecurityInventoryResponse,
  InventoryHealthResponse,
  InventoryAuditLogDto,
} from "@nos/shared-types";
import {
  DeviceInventory,
  MemoryModule,
  DiskDrive,
  Gpu,
  NetworkAdapter,
  InstalledSoftware,
  WindowsService,
  StartupApplication,
  SecurityInventory,
  DeviceCapabilities,
} from "@prisma/client";

type CompleteInventory = DeviceInventory & {
  memoryModules?: MemoryModule[];
  diskDrives?: DiskDrive[];
  gpus?: Gpu[];
  networkAdapters?: NetworkAdapter[];
  installedSoftware?: InstalledSoftware[];
  windowsServices?: WindowsService[];
  startupApplications?: StartupApplication[];
  security?: SecurityInventory | null;
  capabilities?: DeviceCapabilities | null;
};

@Injectable()
export class PrismaInventoryRepository implements IInventoryRepository {
  private readonly logger = new Logger(PrismaInventoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private mapToDto(
    raw: CompleteInventory | null | undefined,
  ): DeviceInventoryDto {
    if (!raw) return null as unknown as DeviceInventoryDto;
    return {
      id: raw.id,
      deviceId: raw.deviceId,
      manufacturer: raw.manufacturer,
      model: raw.model,
      serialNumber: raw.serialNumber,
      motherboard: raw.motherboard,
      biosVendor: raw.biosVendor,
      biosVersion: raw.biosVersion,
      biosReleaseDate: raw.biosReleaseDate || undefined,
      cpuModel: raw.cpuModel,
      cpuVendor: raw.cpuVendor,
      physicalCores: raw.physicalCores,
      logicalCores: raw.logicalCores,
      hostname: raw.hostname,
      domain: raw.domain,
      workgroup: raw.workgroup,
      osEdition: raw.osEdition,
      osBuild: raw.osBuild,
      architecture: raw.architecture,
      assetFingerprint: raw.assetFingerprint,
      inventoryVersion: raw.inventoryVersion,
      schemaVersion: raw.schemaVersion,
      lastScanAt: raw.lastScanAt.toISOString(),
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
      memoryModules: raw.memoryModules?.map((m) => ({
        id: m.id,
        slot: m.slot,
        capacityBytes: m.capacityBytes,
        speedMHz: m.speedMHz,
        manufacturer: m.manufacturer,
        partNumber: m.partNumber,
        serialNumber: m.serialNumber,
      })),
      diskDrives: raw.diskDrives?.map((d) => ({
        id: d.id,
        driveName: d.driveName,
        model: d.model,
        serialNumber: d.serialNumber,
        mediaType: d.mediaType,
        sizeBytes: d.sizeBytes,
        fileSystem: d.fileSystem,
        isSystemDrive: d.isSystemDrive,
      })),
      gpus: raw.gpus?.map((g) => ({
        id: g.id,
        name: g.name,
        manufacturer: g.manufacturer,
        driverVersion: g.driverVersion,
        vRamBytes: g.vRamBytes,
        resolution: g.resolution,
      })),
      networkAdapters: raw.networkAdapters?.map((n) => ({
        id: n.id,
        name: n.name,
        description: n.description || undefined,
        macAddress: n.macAddress,
        ipv4: n.ipv4,
        ipv6: n.ipv6,
        gateway: n.gateway,
        dns: n.dns,
        speedMbps: n.speedMbps,
        isWireless: n.isWireless,
        isPhysical: n.isPhysical,
        isOperational: n.isOperational,
      })),
      installedSoftware: raw.installedSoftware?.map((s) => ({
        id: s.id,
        name: s.name,
        publisher: s.publisher,
        version: s.version,
        installDate: s.installDate,
        installLocation: s.installLocation || undefined,
      })),
      windowsServices: raw.windowsServices?.map((ws) => ({
        id: ws.id,
        serviceName: ws.serviceName,
        displayName: ws.displayName,
        status: ws.status,
        startType: ws.startType,
        account: ws.account,
      })),
      startupApplications: raw.startupApplications?.map((sa) => ({
        id: sa.id,
        name: sa.name,
        command: sa.command,
        location: sa.location,
        user: sa.user,
      })),
      security: raw.security
        ? {
            id: raw.security.id,
            windowsDefenderEnabled: raw.security.windowsDefenderEnabled,
            firewallEnabled: raw.security.firewallEnabled,
            bitLockerEnabled: raw.security.bitLockerEnabled,
            bitLockerDrive: raw.security.bitLockerDrive || undefined,
            secureBootEnabled: raw.security.secureBootEnabled,
            tpmEnabled: raw.security.tpmEnabled,
            tpmVersion: raw.security.tpmVersion || undefined,
          }
        : null,
      capabilities: raw.capabilities
        ? {
            id: raw.capabilities.id,
            supportsGPU: raw.capabilities.supportsGPU,
            supportsBattery: raw.capabilities.supportsBattery,
            supportsTPM: raw.capabilities.supportsTPM,
            supportsVirtualization: raw.capabilities.supportsVirtualization,
            supportsDocker: raw.capabilities.supportsDocker,
            supportsWSL: raw.capabilities.supportsWSL,
            supportsWiFi: raw.capabilities.supportsWiFi,
            supportsEthernet: raw.capabilities.supportsEthernet,
            virtualMachineDetection: raw.capabilities.virtualMachineDetection,
            vmVendor: raw.capabilities.vmVendor || undefined,
          }
        : null,
    };
  }

  private async resolveDeviceId(idOrUuid: string): Promise<string> {
    try {
      const dev = await this.prisma.device.findFirst({
        where: {
          OR: [{ id: idOrUuid }, { uuid: idOrUuid }],
        },
        select: { id: true },
      });
      return dev ? dev.id : idOrUuid;
    } catch {
      return idOrUuid;
    }
  }

  async upsertInventory(
    deviceId: string,
    payload: SubmitInventoryPayload,
    assetFingerprint: string,
  ): Promise<{
    inventory: DeviceInventoryDto;
    previousInventory: DeviceInventoryDto | null;
  }> {
    const targetDeviceId = await this.resolveDeviceId(deviceId);
    const existing = await this.findCompleteInventory(targetDeviceId);

    const version = existing ? existing.inventoryVersion + 1 : 1;
    const schemaVersion = payload.schemaVersion || "1.0.0";

    const updatedRaw = await this.prisma.$transaction(async (tx) => {
      if (existing) {
        await Promise.all([
          tx.memoryModule.deleteMany({
            where: { deviceInventoryId: existing.id },
          }),
          tx.diskDrive.deleteMany({
            where: { deviceInventoryId: existing.id },
          }),
          tx.gpu.deleteMany({ where: { deviceInventoryId: existing.id } }),
          tx.networkAdapter.deleteMany({
            where: { deviceInventoryId: existing.id },
          }),
          tx.installedSoftware.deleteMany({
            where: { deviceInventoryId: existing.id },
          }),
          tx.windowsService.deleteMany({
            where: { deviceInventoryId: existing.id },
          }),
          tx.startupApplication.deleteMany({
            where: { deviceInventoryId: existing.id },
          }),
          tx.securityInventory.deleteMany({
            where: { deviceInventoryId: existing.id },
          }),
          tx.deviceCapabilities.deleteMany({
            where: { deviceInventoryId: existing.id },
          }),
        ]);
      }

      const parent = await tx.deviceInventory.upsert({
        where: { deviceId: targetDeviceId },
        create: {
          deviceId: targetDeviceId,
          manufacturer: payload.manufacturer || "Unknown",
          model: payload.model || "Unknown",
          serialNumber: payload.serialNumber || "Unknown",
          motherboard: payload.motherboard || "Unknown",
          biosVendor: payload.biosVendor || "Unknown",
          biosVersion: payload.biosVersion || "Unknown",
          biosReleaseDate: payload.biosReleaseDate || null,
          cpuModel: payload.cpuModel || "Unknown",
          cpuVendor: payload.cpuVendor || "Unknown",
          physicalCores: payload.physicalCores || 1,
          logicalCores: payload.logicalCores || 1,
          hostname: payload.hostname || "Unknown",
          domain: payload.domain || "WORKGROUP",
          workgroup: payload.workgroup || "WORKGROUP",
          osEdition: payload.osEdition || "Windows",
          osBuild: payload.osBuild || "Unknown",
          architecture: payload.architecture || "x64",
          assetFingerprint,
          inventoryVersion: version,
          schemaVersion,
          lastScanAt: new Date(),
        },
        update: {
          manufacturer: payload.manufacturer || "Unknown",
          model: payload.model || "Unknown",
          serialNumber: payload.serialNumber || "Unknown",
          motherboard: payload.motherboard || "Unknown",
          biosVendor: payload.biosVendor || "Unknown",
          biosVersion: payload.biosVersion || "Unknown",
          biosReleaseDate: payload.biosReleaseDate || null,
          cpuModel: payload.cpuModel || "Unknown",
          cpuVendor: payload.cpuVendor || "Unknown",
          physicalCores: payload.physicalCores || 1,
          logicalCores: payload.logicalCores || 1,
          hostname: payload.hostname || "Unknown",
          domain: payload.domain || "WORKGROUP",
          workgroup: payload.workgroup || "WORKGROUP",
          osEdition: payload.osEdition || "Windows",
          osBuild: payload.osBuild || "Unknown",
          architecture: payload.architecture || "x64",
          assetFingerprint,
          inventoryVersion: version,
          schemaVersion,
          lastScanAt: new Date(),
        },
      });

      if (payload.memoryModules && payload.memoryModules.length > 0) {
        await tx.memoryModule.createMany({
          data: payload.memoryModules.map((m) => ({
            deviceInventoryId: parent.id,
            slot: m.slot || "DIMM",
            capacityBytes: m.capacityBytes || 0,
            speedMHz: m.speedMHz || 0,
            manufacturer: m.manufacturer || "Unknown",
            partNumber: m.partNumber || "Unknown",
            serialNumber: m.serialNumber || "Unknown",
          })),
        });
      }

      if (payload.diskDrives && payload.diskDrives.length > 0) {
        await tx.diskDrive.createMany({
          data: payload.diskDrives.map((d) => ({
            deviceInventoryId: parent.id,
            driveName: d.driveName || "Drive",
            model: d.model || "Unknown",
            serialNumber: d.serialNumber || "Unknown",
            mediaType: d.mediaType || "Fixed",
            sizeBytes: d.sizeBytes || 0,
            fileSystem: d.fileSystem || "NTFS",
            isSystemDrive: d.isSystemDrive ?? false,
          })),
        });
      }

      if (payload.gpus && payload.gpus.length > 0) {
        await tx.gpu.createMany({
          data: payload.gpus.map((g) => ({
            deviceInventoryId: parent.id,
            name: g.name || "GPU Adapter",
            manufacturer: g.manufacturer || "Unknown",
            driverVersion: g.driverVersion || "Unknown",
            vRamBytes: g.vRamBytes || 0,
            resolution: g.resolution || "Unknown",
          })),
        });
      }

      if (payload.networkAdapters && payload.networkAdapters.length > 0) {
        await tx.networkAdapter.createMany({
          data: payload.networkAdapters.map((n) => ({
            deviceInventoryId: parent.id,
            name: n.name || "Network Adapter",
            description: n.description || "Network Adapter",
            macAddress: n.macAddress || "00:00:00:00:00:00",
            ipv4: n.ipv4 || null,
            ipv6: n.ipv6 || null,
            gateway: n.gateway || null,
            dns: n.dns || null,
            speedMbps: n.speedMbps || 0,
            isWireless: n.isWireless ?? false,
            isPhysical: n.isPhysical ?? true,
            isOperational: n.isOperational ?? true,
          })),
        });
      }

      if (payload.installedSoftware && payload.installedSoftware.length > 0) {
        await tx.installedSoftware.createMany({
          data: payload.installedSoftware.map((s) => ({
            deviceInventoryId: parent.id,
            name: s.name || "Unknown Application",
            publisher: s.publisher || "Unknown",
            version: s.version || "Unknown",
            installDate: s.installDate || "Unknown",
            installLocation: s.installLocation || null,
          })),
        });
      }

      if (payload.windowsServices && payload.windowsServices.length > 0) {
        await tx.windowsService.createMany({
          data: payload.windowsServices.map((ws) => ({
            deviceInventoryId: parent.id,
            serviceName: ws.serviceName || "Service",
            displayName: ws.displayName || ws.serviceName || "Unknown",
            status: ws.status || "Stopped",
            startType: ws.startType || "Manual",
            account: ws.account || "LocalSystem",
          })),
        });
      }

      if (
        payload.startupApplications &&
        payload.startupApplications.length > 0
      ) {
        await tx.startupApplication.createMany({
          data: payload.startupApplications.map((sa) => ({
            deviceInventoryId: parent.id,
            name: sa.name || "Startup App",
            command: sa.command || "",
            location: sa.location || "Registry",
            user: sa.user || "All Users",
          })),
        });
      }

      if (payload.security) {
        await tx.securityInventory.create({
          data: {
            deviceInventoryId: parent.id,
            windowsDefenderEnabled:
              payload.security.windowsDefenderEnabled ?? true,
            firewallEnabled: payload.security.firewallEnabled ?? true,
            bitLockerEnabled: payload.security.bitLockerEnabled ?? false,
            bitLockerDrive: payload.security.bitLockerDrive || null,
            secureBootEnabled: payload.security.secureBootEnabled ?? true,
            tpmEnabled: payload.security.tpmEnabled ?? true,
            tpmVersion: payload.security.tpmVersion || "2.0",
          },
        });
      }

      if (payload.capabilities) {
        await tx.deviceCapabilities.create({
          data: {
            deviceInventoryId: parent.id,
            supportsGPU: payload.capabilities.supportsGPU ?? false,
            supportsBattery: payload.capabilities.supportsBattery ?? false,
            supportsTPM: payload.capabilities.supportsTPM ?? true,
            supportsVirtualization:
              payload.capabilities.supportsVirtualization ?? true,
            supportsDocker: payload.capabilities.supportsDocker ?? false,
            supportsWSL: payload.capabilities.supportsWSL ?? false,
            supportsWiFi: payload.capabilities.supportsWiFi ?? false,
            supportsEthernet: payload.capabilities.supportsEthernet ?? true,
            virtualMachineDetection:
              payload.capabilities.virtualMachineDetection ?? false,
            vmVendor: payload.capabilities.vmVendor || null,
          },
        });
      }

      return tx.deviceInventory.findUnique({
        where: { deviceId: targetDeviceId },
        include: {
          memoryModules: true,
          diskDrives: true,
          gpus: true,
          networkAdapters: true,
          installedSoftware: true,
          windowsServices: true,
          startupApplications: true,
          security: true,
          capabilities: true,
        },
      });
    });

    return {
      inventory: this.mapToDto(updatedRaw),
      previousInventory: existing,
    };
  }

  async findCompleteInventory(
    deviceId: string,
  ): Promise<DeviceInventoryDto | null> {
    const targetDeviceId = await this.resolveDeviceId(deviceId);
    const raw = await this.prisma.deviceInventory.findUnique({
      where: { deviceId: targetDeviceId },
      include: {
        memoryModules: true,
        diskDrives: true,
        gpus: true,
        networkAdapters: true,
        installedSoftware: true,
        windowsServices: true,
        startupApplications: true,
        security: true,
        capabilities: true,
      },
    });

    if (!raw) return null;
    return this.mapToDto(raw);
  }

  async findHardwareInventory(
    deviceId: string,
  ): Promise<HardwareInventoryResponse | null> {
    const targetDeviceId = await this.resolveDeviceId(deviceId);
    const raw = await this.prisma.deviceInventory.findUnique({
      where: { deviceId: targetDeviceId },
      select: {
        deviceId: true,
        manufacturer: true,
        model: true,
        serialNumber: true,
        motherboard: true,
        biosVendor: true,
        biosVersion: true,
        cpuModel: true,
        cpuVendor: true,
        physicalCores: true,
        logicalCores: true,
        assetFingerprint: true,
        memoryModules: true,
        diskDrives: true,
        gpus: true,
      },
    });

    if (!raw) return null;
    return {
      deviceId: raw.deviceId,
      manufacturer: raw.manufacturer,
      model: raw.model,
      serialNumber: raw.serialNumber,
      motherboard: raw.motherboard,
      biosVendor: raw.biosVendor,
      biosVersion: raw.biosVersion,
      cpuModel: raw.cpuModel,
      cpuVendor: raw.cpuVendor,
      physicalCores: raw.physicalCores,
      logicalCores: raw.logicalCores,
      assetFingerprint: raw.assetFingerprint,
      memoryModules: raw.memoryModules.map((m) => ({
        id: m.id,
        slot: m.slot,
        capacityBytes: m.capacityBytes,
        speedMHz: m.speedMHz,
        manufacturer: m.manufacturer,
        partNumber: m.partNumber,
        serialNumber: m.serialNumber,
      })),
      diskDrives: raw.diskDrives.map((d) => ({
        id: d.id,
        driveName: d.driveName,
        model: d.model,
        serialNumber: d.serialNumber,
        mediaType: d.mediaType,
        sizeBytes: d.sizeBytes,
        fileSystem: d.fileSystem,
        isSystemDrive: d.isSystemDrive,
      })),
      gpus: raw.gpus.map((g) => ({
        id: g.id,
        name: g.name,
        manufacturer: g.manufacturer,
        driverVersion: g.driverVersion,
        vRamBytes: g.vRamBytes,
        resolution: g.resolution,
      })),
    };
  }

  async findSoftwareInventory(
    deviceId: string,
    search?: string,
    page = 1,
    limit = 50,
  ): Promise<SoftwareInventoryResponse | null> {
    const targetDeviceId = await this.resolveDeviceId(deviceId);
    const inv = await this.prisma.deviceInventory.findUnique({
      where: { deviceId: targetDeviceId },
      select: { id: true, deviceId: true },
    });
    if (!inv) return null;

    const skip = (Math.max(1, page) - 1) * limit;
    const softwareWhere = search
      ? {
          deviceInventoryId: inv.id,
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { publisher: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : { deviceInventoryId: inv.id };

    const servicesWhere = search
      ? {
          deviceInventoryId: inv.id,
          OR: [
            { serviceName: { contains: search, mode: "insensitive" as const } },
            { displayName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : { deviceInventoryId: inv.id };

    const startupWhere = search
      ? {
          deviceInventoryId: inv.id,
          name: { contains: search, mode: "insensitive" as const },
        }
      : { deviceInventoryId: inv.id };

    const [
      software,
      totalSoftware,
      services,
      totalServices,
      startup,
      totalStartup,
    ] = await Promise.all([
      this.prisma.installedSoftware.findMany({
        where: softwareWhere,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      this.prisma.installedSoftware.count({ where: softwareWhere }),
      this.prisma.windowsService.findMany({
        where: servicesWhere,
        skip,
        take: limit,
        orderBy: { displayName: "asc" },
      }),
      this.prisma.windowsService.count({ where: servicesWhere }),
      this.prisma.startupApplication.findMany({
        where: startupWhere,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      this.prisma.startupApplication.count({ where: startupWhere }),
    ]);

    return {
      deviceId: inv.deviceId,
      installedSoftware: software.map((s) => ({
        id: s.id,
        name: s.name,
        publisher: s.publisher,
        version: s.version,
        installDate: s.installDate,
        installLocation: s.installLocation || undefined,
      })),
      windowsServices: services.map((s) => ({
        id: s.id,
        serviceName: s.serviceName,
        displayName: s.displayName,
        status: s.status,
        startType: s.startType,
        account: s.account,
      })),
      startupApplications: startup.map((s) => ({
        id: s.id,
        name: s.name,
        command: s.command,
        location: s.location,
        user: s.user,
      })),
      totalSoftware,
      totalServices,
      totalStartup,
    };
  }

  async findNetworkInventory(
    deviceId: string,
  ): Promise<NetworkInventoryResponse | null> {
    const targetDeviceId = await this.resolveDeviceId(deviceId);
    const inv = await this.prisma.deviceInventory.findUnique({
      where: { deviceId: targetDeviceId },
      select: { deviceId: true, networkAdapters: true },
    });
    if (!inv) return null;

    return {
      deviceId: inv.deviceId,
      networkAdapters: inv.networkAdapters.map((n) => ({
        id: n.id,
        name: n.name,
        description: n.description || undefined,
        macAddress: n.macAddress,
        ipv4: n.ipv4,
        ipv6: n.ipv6,
        gateway: n.gateway,
        dns: n.dns,
        speedMbps: n.speedMbps,
        isWireless: n.isWireless,
        isPhysical: n.isPhysical,
        isOperational: n.isOperational,
      })),
      totalAdapters: inv.networkAdapters.length,
    };
  }

  async findSecurityInventory(
    deviceId: string,
  ): Promise<SecurityInventoryResponse | null> {
    const targetDeviceId = await this.resolveDeviceId(deviceId);
    const inv = await this.prisma.deviceInventory.findUnique({
      where: { deviceId: targetDeviceId },
      select: { deviceId: true, security: true, capabilities: true },
    });
    if (!inv) return null;

    return {
      deviceId: inv.deviceId,
      security: inv.security
        ? {
            id: inv.security.id,
            windowsDefenderEnabled: inv.security.windowsDefenderEnabled,
            firewallEnabled: inv.security.firewallEnabled,
            bitLockerEnabled: inv.security.bitLockerEnabled,
            bitLockerDrive: inv.security.bitLockerDrive || undefined,
            secureBootEnabled: inv.security.secureBootEnabled,
            tpmEnabled: inv.security.tpmEnabled,
            tpmVersion: inv.security.tpmVersion || undefined,
          }
        : null,
      capabilities: inv.capabilities
        ? {
            id: inv.capabilities.id,
            supportsGPU: inv.capabilities.supportsGPU,
            supportsBattery: inv.capabilities.supportsBattery,
            supportsTPM: inv.capabilities.supportsTPM,
            supportsVirtualization: inv.capabilities.supportsVirtualization,
            supportsDocker: inv.capabilities.supportsDocker,
            supportsWSL: inv.capabilities.supportsWSL,
            supportsWiFi: inv.capabilities.supportsWiFi,
            supportsEthernet: inv.capabilities.supportsEthernet,
            virtualMachineDetection: inv.capabilities.virtualMachineDetection,
            vmVendor: inv.capabilities.vmVendor || undefined,
          }
        : null,
    };
  }

  async getInventoryHealth(
    deviceId?: string,
  ): Promise<InventoryHealthResponse> {
    if (deviceId) {
      const targetDeviceId = await this.resolveDeviceId(deviceId);
      const inv = await this.prisma.deviceInventory.findUnique({
        where: { deviceId: targetDeviceId },
        include: { device: { select: { agentVersion: true } } },
      });
      if (!inv) {
        return {
          deviceId,
          inventoryVersion: 0,
          inventorySchemaVersion: "1.0.0",
          agentVersion: "Unknown",
          lastScan: new Date(0).toISOString(),
          inventoryAgeSeconds: -1,
          status: "NOT_INITIALIZED",
        };
      }
      const ageSeconds = Math.round(
        (Date.now() - inv.lastScanAt.getTime()) / 1000,
      );
      return {
        deviceId,
        inventoryVersion: inv.inventoryVersion,
        inventorySchemaVersion: inv.schemaVersion,
        agentVersion: inv.device?.agentVersion || "2.0.0-phase3",
        lastScan: inv.lastScanAt.toISOString(),
        inventoryAgeSeconds: ageSeconds,
        status: ageSeconds > 86400 * 2 ? "STALE" : "HEALTHY",
      };
    }

    // Global health diagnostics across all monitored nodes
    const latestInv = await this.prisma.deviceInventory.findFirst({
      orderBy: { lastScanAt: "desc" },
      include: { device: { select: { agentVersion: true } } },
    });
    if (!latestInv) {
      return {
        inventoryVersion: 0,
        inventorySchemaVersion: "1.0.0",
        agentVersion: "None",
        lastScan: new Date(0).toISOString(),
        inventoryAgeSeconds: -1,
        status: "NOT_INITIALIZED",
      };
    }
    const ageSeconds = Math.round(
      (Date.now() - latestInv.lastScanAt.getTime()) / 1000,
    );
    return {
      inventoryVersion: latestInv.inventoryVersion,
      inventorySchemaVersion: latestInv.schemaVersion,
      agentVersion: latestInv.device?.agentVersion || "2.0.0-phase3",
      lastScan: latestInv.lastScanAt.toISOString(),
      inventoryAgeSeconds: ageSeconds,
      status: ageSeconds > 86400 * 2 ? "STALE" : "HEALTHY",
    };
  }

  async createAuditLog(
    deviceId: string,
    action: InventoryAuditAction,
    changeDetails: string,
  ): Promise<void> {
    await this.prisma.inventoryAuditLog.create({
      data: {
        deviceId,
        action,
        changeDetails,
      },
    });
  }

  async getRecentAuditLogs(
    deviceId: string,
    limit = 15,
  ): Promise<InventoryAuditLogDto[]> {
    const logs = await this.prisma.inventoryAuditLog.findMany({
      where: { deviceId },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
    return logs.map((l) => ({
      id: l.id,
      deviceId: l.deviceId,
      action: l.action as unknown as InventoryAuditLogDto["action"],
      changeDetails: l.changeDetails,
      timestamp: l.timestamp.toISOString(),
    }));
  }

  async search(query: string, organizationId: string): Promise<any[]> {
    return this.prisma.deviceInventory.findMany({
      where: {
        device: { organizationId },
        OR: [
          { manufacturer: { contains: query, mode: "insensitive" } },
          { model: { contains: query, mode: "insensitive" } },
          { serialNumber: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 20,
    });
  }
}
