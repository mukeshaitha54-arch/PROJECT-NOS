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
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { TenantContext } from "@nos/shared-types";
import { PrismaService } from "../../database/prisma.service";
import { deviceLiveProcessesStore } from "../../common/stores/device-processes.store";
import { deviceTelemetryPausedStore } from "../../common/stores/device-telemetry-paused.store";
import { decommissionedDevicesStore } from "../../common/stores/device-decommissioned.store";
import { DeviceTelemetryStatusEvent } from "../../common/events/domain-events";

@ApiTags("Frontend Dashboard Devices API")
@Controller("devices")
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private getDeviceQueryWhere(id: string, orgId?: string) {
    const idFilter = { OR: [{ id }, { uuid: id }] };
    if (!orgId || orgId === "default-org") {
      return idFilter;
    }
    return {
      AND: [
        idFilter,
        {
          OR: [
            { tenantId: orgId },
            { organizationId: orgId },
            { tenantId: null, organizationId: null },
            { tenantId: "default-org" },
            { organizationId: "default-org" },
            { tenantId: null },
            { organizationId: null },
          ],
        },
      ],
    };
  }

  private async findDevice(
    id: string,
    orgId?: string,
    include?: any,
    isSuperAdmin = false,
  ) {
    const idFilter = { OR: [{ id }, { uuid: id }] };

    if (!isSuperAdmin && orgId && orgId !== "default-org") {
      const scoped = await this.prisma.device.findFirst({
        where: {
          AND: [
            idFilter,
            {
              OR: [
                { tenantId: orgId },
                { organizationId: orgId },
                { tenantId: null, organizationId: null },
                { tenantId: "default-org" },
                { organizationId: "default-org" },
                { tenantId: null },
                { organizationId: null },
              ],
            },
          ],
        },
        include,
      });
      if (scoped) return scoped;
    }

    // Direct fallback by id or uuid
    const fallback = await this.prisma.device.findFirst({
      where: idFilter,
      include,
    });

    if (!fallback) return null;

    // Check cross-tenant isolation: allow if SUPER_ADMIN or matches org or default-org
    if (!isSuperAdmin && orgId && orgId !== "default-org") {
      const devOrg = fallback.organizationId;
      const devTenant = fallback.tenantId;
      const isCrossTenant =
        devOrg &&
        devOrg !== "default-org" &&
        devOrg !== orgId &&
        devTenant &&
        devTenant !== "default-org" &&
        devTenant !== orgId;

      if (isCrossTenant) {
        return null;
      }
    }

    // Auto-heal org mapping in background
    if (
      orgId &&
      orgId !== "default-org" &&
      (!fallback.organizationId || fallback.organizationId === "default-org")
    ) {
      this.prisma.device
        .update({
          where: { id: fallback.id },
          data: { organizationId: orgId, tenantId: orgId },
        })
        .catch(() => {});
    }

    return fallback;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List all devices with latest snapshot" })
  async getDevices(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user?: any,
  ) {
    const isSuperAdmin = user?.role === "SUPER_ADMIN";
    const orgId = isSuperAdmin ? undefined : tenant.organizationId;

    // Fire-and-forget: sync tenantId for any legacy device that has organizationId but wrong tenantId
    if (orgId && orgId !== "default-org") {
      this.prisma.device
        .updateMany({
          where: {
            organizationId: orgId,
            OR: [{ tenantId: { not: orgId } }, { tenantId: null }],
          },
          data: { tenantId: orgId },
        })
        .catch(() => {});
    }

    const where =
      orgId && orgId !== "default-org"
        ? {
            OR: [
              { tenantId: orgId },
              { organizationId: orgId },
              { tenantId: null, organizationId: null },
              { tenantId: "default-org" },
              { organizationId: "default-org" },
            ],
          }
        : {};

    // Query by tenantId OR organizationId to catch all devices for this org
    const devices = await this.prisma.device.findMany({
      where,
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
  async getStats(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user?: any,
  ) {
    const isSuperAdmin = user?.role === "SUPER_ADMIN";
    const orgId = isSuperAdmin ? undefined : tenant.organizationId;

    const where =
      orgId && orgId !== "default-org"
        ? {
            OR: [
              { tenantId: orgId },
              { organizationId: orgId },
              { tenantId: null, organizationId: null },
              { tenantId: "default-org" },
              { organizationId: "default-org" },
            ],
          }
        : {};

    const devices = await this.prisma.device.findMany({
      where,
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
        ...(orgId && orgId !== "default-org" ? { tenantId: orgId } : {}),
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
    @CurrentUser() user?: any,
  ) {
    const isSuperAdmin = user?.role === "SUPER_ADMIN";
    const orgId = tenant.organizationId;
    const device = await this.findDevice(
      id,
      orgId,
      { inventory: true },
      isSuperAdmin,
    );

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    const deviceIdMatch = device.uuid
      ? { in: [device.id, device.uuid] }
      : device.id;

    const latestSnapshot = await this.prisma.telemetrySnapshot.findFirst({
      where: { deviceId: deviceIdMatch },
      orderBy: { timestamp: "desc" },
    });

    const latestHeartbeat = await this.prisma.heartbeat.findFirst({
      where: { deviceId: deviceIdMatch },
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
    @CurrentUser() user?: any,
  ) {
    const isSuperAdmin = user?.role === "SUPER_ADMIN";
    const orgId = tenant.organizationId;
    const device = await this.findDevice(id, orgId, undefined, isSuperAdmin);

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

    const deviceIdMatch = device.uuid
      ? { in: [device.id, device.uuid] }
      : device.id;

    const telemetry = await this.prisma.telemetrySnapshot.findMany({
      where: {
        deviceId: deviceIdMatch,
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
    @CurrentUser() user?: any,
  ) {
    const isSuperAdmin = user?.role === "SUPER_ADMIN";
    const orgId = tenant.organizationId;
    const device = await this.findDevice(id, orgId, undefined, isSuperAdmin);

    if (!device) throw new NotFoundException("Device not found");

    // 1. Check live processes reported by agent via heartbeat/telemetry
    const live =
      deviceLiveProcessesStore.get(device.id) ||
      (device.uuid ? deviceLiveProcessesStore.get(device.uuid) : null);
    const validLive = live?.filter(
      (p: any) =>
        p &&
        (p.pid !== undefined || p.Pid !== undefined) &&
        (p.name || p.Name || p.processName || p.ProcessName),
    );
    if (validLive && validLive.length > 0) {
      return {
        success: true,
        data: validLive.map((p: any) => ({
          pid: p.pid ?? p.Pid,
          name: p.name ?? p.Name ?? p.processName ?? p.ProcessName,
          processName: p.processName ?? p.ProcessName ?? p.name ?? p.Name,
          memoryMb:
            p.memoryMb ??
            p.MemoryMb ??
            (p.memoryBytes
              ? Number((p.memoryBytes / (1024 * 1024)).toFixed(1))
              : 0),
          memoryBytes:
            p.memoryBytes ??
            p.MemoryBytes ??
            (p.memoryMb ? Math.round(p.memoryMb * 1024 * 1024) : 0),
          cpuTimeSec: p.cpuTimeSec ?? p.CpuTimeSec ?? 0,
          threads: p.threads ?? p.Threads ?? 1,
          status: p.status ?? p.Status ?? "Running",
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
    @CurrentUser() user?: any,
  ) {
    const isSuperAdmin = user?.role === "SUPER_ADMIN";
    const orgId = tenant.organizationId;
    const device = await this.findDevice(id, orgId, undefined, isSuperAdmin);

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
    @CurrentUser() user?: any,
  ) {
    const isSuperAdmin = user?.role === "SUPER_ADMIN";
    const orgId = tenant.organizationId;
    const device = await this.findDevice(id, orgId, undefined, isSuperAdmin);

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
    @CurrentUser() user?: any,
  ) {
    const isSuperAdmin = user?.role === "SUPER_ADMIN";
    const orgId = tenant.organizationId;
    const device = await this.findDevice(id, orgId, undefined, isSuperAdmin);

    if (!device) throw new NotFoundException("Device not found");

    const deviceIdMatch = device.uuid
      ? { in: [device.id, device.uuid] }
      : device.id;

    const alerts = await this.prisma.alert.findMany({
      where: { deviceId: deviceIdMatch },
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
    @CurrentUser() user?: any,
  ) {
    const isSuperAdmin = user?.role === "SUPER_ADMIN";
    const orgId = tenant.organizationId;
    const device = await this.findDevice(id, orgId, undefined, isSuperAdmin);

    if (!device) throw new NotFoundException("Device not found");

    const deviceIdMatch = device.uuid
      ? { in: [device.id, device.uuid] }
      : device.id;

    const heartbeats = await this.prisma.heartbeat.findMany({
      where: { deviceId: deviceIdMatch },
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
    @CurrentUser() user?: any,
  ) {
    const isSuperAdmin = user?.role === "SUPER_ADMIN";
    const orgId = tenant?.organizationId;
    if (!orgId) {
      throw new UnauthorizedException(
        "Organization context is required to delete a device",
      );
    }
    const device = await this.findDevice(id, orgId, undefined, isSuperAdmin);

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    const deviceId = device.id;

    // Record into decommission registry so running agents immediately self-terminate on next call
    decommissionedDevicesStore.add(deviceId);
    if ((device as any).tokenHash) {
      decommissionedDevicesStore.add((device as any).tokenHash);
    }

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
    const device = await this.findDevice(id, orgId);

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
    const device = await this.findDevice(id, orgId);

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
