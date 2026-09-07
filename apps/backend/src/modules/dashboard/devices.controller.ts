import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { TenantContext } from "@nos/shared-types";
import { PrismaService } from "../../database/prisma.service";

@ApiTags("Frontend Dashboard Devices API")
@Controller("devices")
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List all devices with latest snapshot" })
  async getDevices(@CurrentTenant() tenant: TenantContext) {
    const devices = await this.prisma.device.findMany({
      where: { tenantId: tenant.organizationId },
      include: {
        telemetrySnapshots: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
    });

    return {
      success: true,
      data: devices,
    };
  }

  @Get("stats")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Fleet statistics" })
  async getStats(@CurrentTenant() tenant: TenantContext) {
    const devices = await this.prisma.device.findMany({
      where: { tenantId: tenant.organizationId },
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
        tenantId: tenant.organizationId,
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
    const device = await this.prisma.device.findFirst({
      where: { id, tenantId: tenant.organizationId },
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

    return {
      success: true,
      data: {
        ...device,
        latestSnapshot,
        latestHeartbeat,
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
    const device = await this.prisma.device.findFirst({
      where: { id, tenantId: tenant.organizationId },
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

    const telemetry = await this.prisma.telemetryAggregation.findMany({
      where: {
        deviceId: id,
        periodStart: { gte },
      },
      orderBy: { periodStart: "asc" },
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
    const device = await this.prisma.device.findFirst({
      where: { id, tenantId: tenant.organizationId },
    });

    if (!device) throw new NotFoundException("Device not found");

    // Mock realistic process data since it's not captured in DB yet
    const processes = [
      {
        pid: 1234,
        name: "chrome.exe",
        cpuPercent: 15.5,
        memoryBytes: 536870912,
        status: "Running",
        startedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        pid: 890,
        name: "svchost.exe",
        cpuPercent: 2.1,
        memoryBytes: 134217728,
        status: "Running",
        startedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        pid: 4056,
        name: "code.exe",
        cpuPercent: 8.4,
        memoryBytes: 1073741824,
        status: "Running",
        startedAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        pid: 104,
        name: "explorer.exe",
        cpuPercent: 1.0,
        memoryBytes: 268435456,
        status: "Running",
        startedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        pid: 320,
        name: "services.exe",
        cpuPercent: 0.5,
        memoryBytes: 67108864,
        status: "Running",
        startedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    return {
      success: true,
      data: processes,
    };
  }

  @Get(":id/services")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Windows services" })
  async getServices(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
  ) {
    const device = await this.prisma.device.findFirst({
      where: { id, tenantId: tenant.organizationId },
    });

    if (!device) throw new NotFoundException("Device not found");

    const services = await this.prisma.windowsService.findMany({
      where: { deviceInventory: { deviceId: id } },
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
    const device = await this.prisma.device.findFirst({
      where: { id, tenantId: tenant.organizationId },
    });

    if (!device) throw new NotFoundException("Device not found");

    const software = await this.prisma.installedSoftware.findMany({
      where: { deviceInventory: { deviceId: id } },
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
    const device = await this.prisma.device.findFirst({
      where: { id, tenantId: tenant.organizationId },
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
    const device = await this.prisma.device.findFirst({
      where: { id, tenantId: tenant.organizationId },
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
}
