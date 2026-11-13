import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
  Req,
  Res,
  UnauthorizedException,
  BadRequestException,
  Optional,
} from "@nestjs/common";
import { Request } from "express";
import { SkipThrottle } from "@nestjs/throttler";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { Device } from "@prisma/client";
import { DeviceService } from "./device.service";
import { RegisterDeviceDto, HeartbeatDto } from "./dto/device.dto";
import { DeviceAuthGuard } from "./guards/device-auth.guard";
import { CurrentDevice } from "./decorators/current-device.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../../common/guards/optional-jwt-auth.guard";
import { AlertRuleEngineService } from "../alerts/alert-rule-engine.service";

@SkipThrottle({ auth: true })
@ApiTags("Device Onboarding & Heartbeat (Phase 2A)")
@Controller("device")
export class DeviceController {
  constructor(
    private readonly deviceService: DeviceService,
    private readonly alertRuleEngine: AlertRuleEngineService,
  ) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Register a new monitoring agent",
    description:
      "Provisions unique device hardware identity and returns registration token.",
  })
  @ApiResponse({
    status: 201,
    description:
      "Device registered successfully; returns deviceId and registrationToken.",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid device payload parameters.",
  })
  async register(@Body() dto: RegisterDeviceDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const data = await this.deviceService.register(dto, ipAddress);
    return {
      success: true,
      message:
        "Monitoring agent successfully registered with NOS Zero-Trust control plane.",
      data,
    };
  }

  @Post("heartbeat")
  @HttpCode(HttpStatus.OK)
  @UseGuards(DeviceAuthGuard)
  @ApiOperation({
    summary: "Agent diagnostic heartbeat ingestion (Every 30 seconds)",
    description:
      "Records basic CPU/RAM operational health and refreshes Last Seen timer.",
  })
  @ApiHeader({
    name: "X-Device-Token",
    required: true,
    description: "Cryptographic agent registration credentials",
  })
  @ApiResponse({
    status: 200,
    description: "Heartbeat ingested and device status marked ONLINE.",
  })
  @ApiResponse({
    status: 401,
    description: "Missing or unrecognized device authentication token.",
  })
  async heartbeat(@CurrentDevice() device: Device, @Body() dto: HeartbeatDto) {
    const data = await this.deviceService.recordHeartbeat(device, dto);

    if (dto.status && dto.status.toLowerCase() !== "online") {
      const orgId =
        (device as any).tenantId ||
        (device as any).organizationId ||
        "default-org";
      // If heartbeat status is error/critical/offline, evaluate as if metrics breached critical threshold
      this.alertRuleEngine
        .evaluateTelemetry(device.id, orgId, {
          cpu: 100,
          ram: 100,
          disk: 100,
          network: 999999999,
          timestamp: new Date(),
        })
        .catch((err) => {});
    }

    return {
      success: true,
      message: "Heartbeat recorded.",
      data,
    };
  }

  @Get("me")
  @UseGuards(DeviceAuthGuard)
  @ApiOperation({
    summary: "Retrieve authenticated device profile",
    description:
      "Returns current registered device details and latest recorded heartbeat.",
  })
  @ApiHeader({
    name: "X-Device-Token",
    required: true,
    description: "Cryptographic agent registration credentials",
  })
  @ApiResponse({
    status: 200,
    description: "Device identity profile returned successfully.",
  })
  @ApiResponse({ status: 401, description: "Unauthorized agent session." })
  async getMe(@CurrentDevice() device: Device) {
    const data = await this.deviceService.getDeviceProfile(device);
    return {
      success: true,
      data,
    };
  }

  @Get("status")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Retrieve real-time platform device status and heartbeat roster",
    description:
      "Returns devices scoped to the authenticated user's organization. Unauthenticated requests return all devices (legacy).",
  })
  @ApiResponse({
    status: 200,
    description: "Platform heartbeat status retrieved successfully.",
  })
  async getStatus(@CurrentUser() user?: any) {
    // Scope to user's organization for data isolation
    const organizationId =
      user?.organizationId || user?.organization?.id || undefined;
    const data = await this.deviceService.getPlatformStatus(organizationId);
    return {
      success: true,
      data,
    };
  }

  @Get("unassigned/:orgId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Retrieve unassigned devices for an organization" })
  @ApiResponse({
    status: 200,
    description: "Unassigned devices retrieved successfully.",
  })
  async getUnassignedDevices(
    @Param("orgId") orgId: string,
    @CurrentUser() user?: any,
  ) {
    const userOrgId = user?.organizationId || user?.organization?.id;
    if (userOrgId && userOrgId !== orgId && user?.role !== "SUPER_ADMIN") {
      throw new UnauthorizedException(
        "Unauthorized access to target organization devices",
      );
    }
    const data = await this.deviceService.getUnassignedDevices(orgId);
    return {
      success: true,
      data,
    };
  }

  @Post(":id/claim")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Claim an unassigned device" })
  async claimDevice(
    @Param("id") id: string,
    @Body("organizationId") organizationId?: string,
    @Body("teamId") teamId?: string,
    @Body("departmentId") departmentId?: string,
    @CurrentUser() user?: any,
  ) {
    if (!user)
      throw new UnauthorizedException("Must be logged in to claim device");
    const userOrgId = user.organizationId || user.organization?.id;
    const targetOrgId =
      user.role === "SUPER_ADMIN" ? organizationId || userOrgId : userOrgId;
    if (!targetOrgId) {
      throw new BadRequestException("Organization ID required to claim device");
    }
    if (
      user.role !== "SUPER_ADMIN" &&
      organizationId &&
      organizationId !== userOrgId
    ) {
      throw new UnauthorizedException(
        "Cannot claim device for a different organization.",
      );
    }
    const data = await this.deviceService.claimDevice(
      id,
      targetOrgId,
      user.id,
      teamId,
      departmentId,
    );
    return {
      success: true,
      message: "Device claimed successfully.",
      data,
    };
  }

  @Get("download")
  @ApiOperation({ summary: "Download the NOS Windows Agent Installer" })
  @ApiResponse({
    status: 200,
    description: "Returns the installer executable.",
  })
  async downloadAgent(@Req() req: Request, @Res() res: any) {
    const path = require("path");
    const fs = require("fs");

    const possiblePaths = [
      path.join(
        process.cwd(),
        "apps",
        "installer",
        "NOS.Installer",
        "bin",
        "Release",
        "net8.0-windows",
        "win-x64",
        "publish",
        "NOS.Installer.exe",
      ),
      path.join(
        process.cwd(),
        "..",
        "installer",
        "NOS.Installer",
        "bin",
        "Release",
        "net8.0-windows",
        "win-x64",
        "publish",
        "NOS.Installer.exe",
      ),
      path.join(
        process.cwd(),
        "..",
        "..",
        "apps",
        "installer",
        "NOS.Installer",
        "bin",
        "Release",
        "net8.0-windows",
        "win-x64",
        "publish",
        "NOS.Installer.exe",
      ),
      path.join(process.cwd(), "apps", "backend", "assets", "NOS-Agent.exe"),
      path.join(process.cwd(), "assets", "NOS-Agent.exe"),
      path.join(__dirname, "..", "..", "..", "..", "assets", "NOS-Agent.exe"),
      path.join(__dirname, "..", "..", "..", "assets", "NOS-Agent.exe"),
      path.join(process.cwd(), "apps", "NOS.Agent", "publish", "NOS.Agent.exe"),
    ];

    const foundPath = possiblePaths.find((p: string) => fs.existsSync(p));

    if (foundPath) {
      const fileName = path.basename(foundPath);
      const stat = fs.statSync(foundPath);

      if (typeof res.header === "function") {
        res.header("Content-Type", "application/octet-stream");
        res.header("Content-Disposition", `attachment; filename="${fileName}"`);
        res.header("Content-Length", stat.size);
      } else if (typeof res.setHeader === "function") {
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${fileName}"`,
        );
        res.setHeader("Content-Length", stat.size);
      }

      if (typeof res.download === "function") {
        return res.download(foundPath, fileName);
      }

      const stream = fs.createReadStream(foundPath);
      return res.send(stream);
    }

    return res.status(404).send({
      success: false,
      message: "Installer or agent executable not found.",
    });
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      "Retrieve specific registered machine profile by primary DB ID or UUID",
    description:
      "Returns complete hardware profile and latest diagnostic heartbeat sample for target device.",
  })
  @ApiResponse({
    status: 200,
    description: "Device profile and heartbeat retrieved successfully.",
  })
  @ApiResponse({ status: 404, description: "Device not found in registry." })
  async getDeviceById(@Param("id") id: string, @CurrentUser() user?: any) {
    const isSuperAdmin = user?.role === "SUPER_ADMIN";
    const organizationId = isSuperAdmin
      ? undefined
      : user?.organizationId || user?.organization?.id || undefined;
    const data = await this.deviceService.getDeviceById(
      id,
      organizationId,
      isSuperAdmin,
    );
    return {
      success: true,
      data,
    };
  }

  @Post(":id/maintenance")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Toggle device maintenance mode",
    description:
      "Places device in maintenance mode to suspend alert rule evaluations during scheduled servicing.",
  })
  async setMaintenanceMode(
    @Param("id") id: string,
    @Body("enabled") enabled: boolean,
    @CurrentUser() user?: any,
  ) {
    const orgId = user?.organizationId || user?.organization?.id;
    const data = await this.deviceService.setMaintenanceMode(
      id,
      enabled,
      user?.id,
      user?.email,
      orgId,
    );
    return {
      success: true,
      message: enabled
        ? "Device placed in maintenance mode."
        : "Device maintenance mode disabled.",
      data,
    };
  }

  @Post(":id/retire")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Retire device from active monitoring roster" })
  async retireDevice(@Param("id") id: string, @CurrentUser() user?: any) {
    const orgId = user?.organizationId || user?.organization?.id;
    const data = await this.deviceService.retireDevice(
      id,
      user?.id,
      user?.email,
      orgId,
    );
    return {
      success: true,
      message: "Device retired.",
      data,
    };
  }

  @Post("bulk/status")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Bulk update status for multiple devices" })
  async bulkUpdateStatus(
    @Body("deviceIds") deviceIds: string[],
    @Body("status") status: any,
    @CurrentUser() user?: any,
  ) {
    const orgId = user?.organizationId || user?.organization?.id;
    const data = await this.deviceService.bulkUpdateStatus(
      deviceIds,
      status,
      user?.id,
      user?.email,
      orgId,
    );
    return {
      success: true,
      message: `Bulk updated status for ${data.updatedCount} devices.`,
      data,
    };
  }
}
