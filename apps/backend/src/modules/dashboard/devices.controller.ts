import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { TenantContext } from "@nos/shared-types";
import { PrismaService } from "../../database/prisma.service";
import { deviceLiveProcessesStore } from "../../common/stores/device-processes.store";
import { deviceTelemetryPausedStore } from "../../common/stores/device-telemetry-paused.store";
import { DeviceTelemetryStatusEvent } from "../../common/events/domain-events";

@ApiTags("Frontend Dashboard Devices API")
@Controller("devices")
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List all devices with latest snapshot" })
  async getDevices(@CurrentTenant() tenant: TenantContext) {
    const orgId = tenant.organizationId;

    // Fire-and-forget: sync tenantId for any legacy device that has organizationId but wrong tenantId
    this.prisma.device
      .updateMany({
        where: { organizationId: orgId, tenantId: { not: orgId } },
        data: { tenantId: orgId },
      })
      .catch(() => {});

    // Query by tenantId OR organizationId to catch all devices for this org
    const devices = await this.prisma.device.findMany({
      where: {
        OR: [{ tenantId: orgId }, { organizationId: orgId }],
      },
      orderBy: { lastSeen: "desc" },
      include: {
        telemetrySnapshots: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
        heartbeats: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
    });

    // Serialize BigInt fields to Number to avoid JSON issues
    const serialized = devices.map((device) => {
      const snap = device.telemetrySnapshots[0] || null;
      const hb = (device as any).heartbeats?.[0] || null;
      return {
        ...device,
        telemetryPaused:
          deviceTelemetryPausedStore.get(device.id) ??
          deviceTelemetryPausedStore.get(device.uuid) ??
          false,
        latestSnapshot: snap
          ? {
              ...snap,
              bytesSent: snap.bytesSent ? Number(snap.bytesSent) : 0,
              bytesReceived: snap.bytesReceived
                ? Number(snap.bytesReceived)
                : 0,
            }
          : null,
        latestHeartbeat: hb,
        lastHeartbeat: hb,
        heartbeats: hb ? [hb] : [],
        telemetrySnapshots: undefined,
      };
    });

    return {
      success: true,
      data: serialized,
    };
  }

  @Get("stats")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Fleet statistics" })
  async getStats(@CurrentTenant() tenant: TenantContext) {
    const orgId = tenant.organizationId;

    const devices = await this.prisma.device.findMany({
      where: {
        OR: [{ tenantId: orgId }, { organizationId: orgId }],
      },
      select: { status: true },
    });

    const stats = {
      total: devices.length,
      online: devices.filter((d) => d.status === "ONLINE").length,
      offline: devices.filter((d) => d.status === "OFFLINE").length,
      warning: devices.filter((d) => d.status === "DEGRADED").length,
      critical: devices.filter((d) => d.status === "CRITICAL").length,
    };

    const alerts = await this.prisma.alert.count({
      where: {
        tenantId: orgId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    return {
      success: true,
      data: { ...stats, alertsToday: alerts },
    };
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Single device details" })
  async getDeviceById(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
  ) {
    const orgId = tenant.organizationId;
    const device = await this.prisma.device.findFirst({
      where: {
        id,
        OR: [{ tenantId: orgId }, { organizationId: orgId }],
      },
      include: {
        inventory: true,
      },
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    const latestSnapshot = await this.prisma.telemetrySnapshot.findFirst({
      where: { deviceId: id },
      orderBy: { timestamp: "desc" },
    });

    const latestHeartbeat = await this.prisma.heartbeat.findFirst({
      where: { deviceId: id },
      orderBy: { timestamp: "desc" },
    });

    // Serialize BigInt fields to Number to avoid JSON issues
    const serializeSnap = (snap: any) =>
      snap
        ? {
            ...snap,
            bytesSent: snap.bytesSent ? Number(snap.bytesSent) : 0,
            bytesReceived: snap.bytesReceived ? Number(snap.bytesReceived) : 0,
          }
        : null;

    return {
      success: true,
      data: {
        ...device,
        telemetryPaused:
          deviceTelemetryPausedStore.get(device.id) ??
          deviceTelemetryPausedStore.get(device.uuid) ??
          false,
        latestSnapshot: serializeSnap(latestSnapshot),
        latestHeartbeat,
        lastHeartbeat: latestHeartbeat,
      },
    };
  }

  @Get(":id/telemetry")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Aggregated telemetry" })
  async getTelemetry(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
    @Query("range") range: string = "1h",
  ) {
    const orgId = tenant.organizationId;
    const device = await this.prisma.device.findFirst({
      where: { id, OR: [{ tenantId: orgId }, { organizationId: orgId }] },
    });

    if (!device) throw new NotFoundException("Device not found");

    let gte = new Date();
    switch (range) {
      case "1h":
        gte.setHours(gte.getHours() - 1);
        break;
      case "6h":
        gte.setHours(gte.getHours() - 6);
        break;
      case "24h":
        gte.setHours(gte.getHours() - 24);
        break;
      case "7d":
        gte.setDate(gte.getDate() - 7);
        break;
      case "30d":
        gte.setDate(gte.getDate() - 30);
        break;
      default:
        gte.setHours(gte.getHours() - 1);
    }

    const telemetry = await this.prisma.telemetrySnapshot.findMany({
      where: {
        deviceId: id,
        timestamp: { gte },
      },
      orderBy: { timestamp: "asc" },
      take: 60,
    });

    return {
      success: true,
      data: telemetry,
    };
  }

  @Get(":id/processes")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Current processes" })
  async getProcesses(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
  ) {
    const orgId = tenant.organizationId;
    const device = await this.prisma.device.findFirst({
      where: {
        OR: [{ id }, { uuid: id }],
        ...(orgId
          ? { AND: [{ OR: [{ tenantId: orgId }, { organizationId: orgId }] }] }
          : {}),
      },
    });

    if (!device) throw new NotFoundException("Device not found");

    // 1. Check live processes reported by agent via heartbeat/telemetry
    const live =
      deviceLiveProcessesStore.get(device.id) ||
      (device.uuid ? deviceLiveProcessesStore.get(device.uuid) : null);
    if (live && live.length > 0) {
      return {
        success: true,
        data: live,
      };
    }

    // 2. Fallback: retrieve running services from inventory as processes
    const services = await this.prisma.windowsService.findMany({
      where: {
        deviceInventory: {
          OR: [
            { deviceId: device.id },
            ...(device.uuid ? [{ deviceId: device.uuid }] : []),
          ],
        },
        status: "Running",
      },
      take: 50,
      orderBy: { displayName: "asc" },
    });

    if (services.length > 0) {
      return {
        success: true,
        data: services.map((s, idx) => ({
          pid: 1000 + idx,
          name: `${s.serviceName}.exe`,
          processName: s.displayName,
          memoryMb: 24.5,
          memoryBytes: 25690112,
          cpuTimeSec: 0,
          threads: 4,
          status: "Running",
        })),
      };
    }

    return {
      success: true,
      data: [],
    };
  }

  @Get(":id/services")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Windows services" })
  async getServices(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
  ) {
    const orgId = tenant.organizationId;
    const device = await this.prisma.device.findFirst({
      where: {
        OR: [{ id }, { uuid: id }],
        ...(orgId
          ? { AND: [{ OR: [{ tenantId: orgId }, { organizationId: orgId }] }] }
          : {}),
      },
    });

    if (!device) throw new NotFoundException("Device not found");

    const services = await this.prisma.windowsService.findMany({
      where: {
        deviceInventory: {
          OR: [
            { deviceId: device.id },
            ...(device.uuid ? [{ deviceId: device.uuid }] : []),
          ],
        },
      },
      orderBy: { displayName: "asc" },
    });

    return {
      success: true,
      data: services,
    };
  }

  @Get(":id/software")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Installed software" })
  async getSoftware(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
  ) {
    const orgId = tenant.organizationId;
    const device = await this.prisma.device.findFirst({
      where: {
        OR: [{ id }, { uuid: id }],
        ...(orgId
          ? { AND: [{ OR: [{ tenantId: orgId }, { organizationId: orgId }] }] }
          : {}),
      },
    });

    if (!device) throw new NotFoundException("Device not found");

    const software = await this.prisma.installedSoftware.findMany({
      where: {
        deviceInventory: {
          OR: [
            { deviceId: device.id },
            ...(device.uuid ? [{ deviceId: device.uuid }] : []),
          ],
        },
      },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      data: software,
    };
  }

  @Get(":id/alerts")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Alert history" })
  async getAlerts(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
  ) {
    const orgId = tenant.organizationId;
    const device = await this.prisma.device.findFirst({
      where: { id, OR: [{ tenantId: orgId }, { organizationId: orgId }] },
    });

    if (!device) throw new NotFoundException("Device not found");

    const alerts = await this.prisma.alert.findMany({
      where: { deviceId: id },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: alerts,
    };
  }

  @Get(":id/heartbeats")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Heartbeat history" })
  async getHeartbeats(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
  ) {
    const orgId = tenant.organizationId;
    const device = await this.prisma.device.findFirst({
      where: { id, OR: [{ tenantId: orgId }, { organizationId: orgId }] },
    });

    if (!device) throw new NotFoundException("Device not found");

    const heartbeats = await this.prisma.heartbeat.findMany({
      where: { deviceId: id },
      orderBy: { timestamp: "desc" },
      take: 50,
    });

    return {
      success: true,
      data: heartbeats,
    };
  }
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a device and all its data" })
  async deleteDevice(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
  ) {
    const device = await this.prisma.device.findFirst({
      where: {
        OR: [{ id }, { uuid: id }],
      },
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    const deviceId = device.id;

    // Delete all related data in order (cascade where not automatic)
    await Promise.allSettled([
      this.prisma.telemetrySnapshot.deleteMany({ where: { deviceId } }),
      this.prisma.heartbeat.deleteMany({ where: { deviceId } }),
      this.prisma.alert.deleteMany({ where: { deviceId } }),
      this.prisma.deviceOwnership.deleteMany({ where: { deviceId } }),
      this.prisma.deviceTransferRequest.deleteMany({ where: { deviceId } }),
      this.prisma.inventoryAuditLog.deleteMany({ where: { deviceId } }),
      this.prisma.deviceTimelineEvent.deleteMany({ where: { deviceId } }),
      this.prisma.maintenanceWindow.deleteMany({ where: { deviceId } }),
      this.prisma.deviceInventory.deleteMany({ where: { deviceId } }),
    ]);

    await this.prisma.device.delete({ where: { id: deviceId } });

    try {
      if (device.organizationId) {
        await this.prisma.organizationQuota.updateMany({
          where: {
            organizationId: device.organizationId,
            currentDevices: { gt: 0 },
          },
          data: { currentDevices: { decrement: 1 } },
        });
      }
    } catch {}

    return {
      success: true,
      message: `Device ${device.hostname} (${deviceId}) and all associated data deleted permanently.`,
    };
  }

  @Post(":id/telemetry/pause")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Pause telemetry collection for a device" })
  async pauseTelemetry(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
  ) {
    const orgId = tenant.organizationId;
    const device = await this.prisma.device.findFirst({
      where: {
        OR: [{ id }, { uuid: id }],
        AND: [{ OR: [{ tenantId: orgId }, { organizationId: orgId }] }],
      },
    });

    if (!device) {
      throw new NotFoundException("Device not found or access denied");
    }

    deviceTelemetryPausedStore.set(device.id, true);
    if (device.uuid) {
      deviceTelemetryPausedStore.set(device.uuid, true);
    }

    this.eventEmitter.emit(
      "device.telemetry.status",
      new DeviceTelemetryStatusEvent(
        device.organizationId || orgId,
        device.id,
        true,
      ),
    );

    return {
      success: true,
      data: {
        id: device.id,
        telemetryPaused: true,
        message: "Telemetry collection has been paused.",
      },
    };
  }

  @Post(":id/telemetry/resume")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resume telemetry collection for a device" })
  async resumeTelemetry(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
  ) {
    const orgId = tenant.organizationId;
    const device = await this.prisma.device.findFirst({
      where: {
        OR: [{ id }, { uuid: id }],
        AND: [{ OR: [{ tenantId: orgId }, { organizationId: orgId }] }],
      },
    });

    if (!device) {
      throw new NotFoundException("Device not found or access denied");
    }

    deviceTelemetryPausedStore.set(device.id, false);
    if (device.uuid) {
      deviceTelemetryPausedStore.set(device.uuid, false);
    }

    this.eventEmitter.emit(
      "device.telemetry.status",
      new DeviceTelemetryStatusEvent(
        device.organizationId || orgId,
        device.id,
        false,
      ),
    );

    return {
      success: true,
      data: {
        id: device.id,
        telemetryPaused: false,
        message: "Telemetry collection has been resumed.",
      },
    };
  }
}
