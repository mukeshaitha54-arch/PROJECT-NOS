import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from "@nestjs/swagger";
import { Device } from "@prisma/client";
import { TelemetryService } from "./telemetry.service";
import {
  SubmitTelemetryDto,
  TelemetryHistoryQueryDto,
} from "./dto/telemetry.dto";
import { DeviceAuthGuard } from "../device/guards/device-auth.guard";
import { CurrentDevice } from "../device/decorators/current-device.decorator";
import { AlertRuleEngineService } from "../alerts/alert-rule-engine.service";

@SkipThrottle({ auth: true })
@ApiTags("Telemetry Ingestion & Queries (Phase 2B)")
@Controller("telemetry")
export class TelemetryController {
  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly alertRuleEngine: AlertRuleEngineService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(DeviceAuthGuard)
  @ApiOperation({
    summary: "Submit real-time hardware telemetry snapshot (30s interval)",
    description:
      "Protected via X-Device-Token. Ingests raw hardware system performance metrics and executes validation bounds checking.",
  })
  @ApiHeader({
    name: "X-Device-Token",
    required: true,
    description: "Cryptographic device authentication credentials",
  })
  @ApiResponse({
    status: 201,
    description: "Telemetry snapshot validated and persisted successfully.",
  })
  @ApiResponse({
    status: 400,
    description:
      "Malformed payload parameters or invalid percentage boundaries.",
  })
  @ApiResponse({
    status: 401,
    description: "Unknown device, invalid token, or expired session.",
  })
  async submitTelemetry(
    @CurrentDevice() device: Device,
    @Body() dto: SubmitTelemetryDto,
  ) {
    const data = await this.telemetryService.recordTelemetry(device, dto);

    // Evaluate rules asynchronously without blocking the ingest response
    const orgId =
      (device as any).tenantId ||
      (device as any).organizationId ||
      "default-org";
    this.alertRuleEngine
      .evaluateTelemetry(device.id, orgId, dto)
      .catch((err) => {
        // logger exists in rule engine, just catch to avoid unhandled promise rejection
      });

    return {
      success: true,
      snapshotId: data.id,
      timestamp: data.timestamp,
      message: "Telemetry snapshot successfully stored in UTC.",
      data,
    };
  }

  @Get("latest/:deviceId")
  @ApiOperation({
    summary: "Retrieve latest telemetry snapshot by Device UUID",
    description:
      "Returns most recent hardware diagnostic snapshot recorded for the specified device.",
  })
  @ApiParam({
    name: "deviceId",
    required: true,
    description: "Target Device Primary Key UUID",
  })
  @ApiResponse({
    status: 200,
    description: "Latest telemetry snapshot retrieved successfully.",
  })
  @ApiResponse({
    status: 404,
    description: "No telemetry historical records exist for target device.",
  })
  async getLatest(@Param("deviceId") deviceId: string) {
    const data = await this.telemetryService.getLatestTelemetry(deviceId);
    return {
      success: true,
      data,
    };
  }

  @Get("history/:deviceId")
  @ApiOperation({
    summary:
      "Retrieve historical telemetry snapshots with time-series pagination",
    description:
      "Supports UTC from/to range filters and limit/page pagination parameters.",
  })
  @ApiParam({
    name: "deviceId",
    required: true,
    description: "Target Device Primary Key UUID",
  })
  @ApiResponse({
    status: 200,
    description: "Paginated telemetry dataset retrieved successfully.",
  })
  async getHistory(
    @Param("deviceId") deviceId: string,
    @Query() query: TelemetryHistoryQueryDto,
  ) {
    const result = await this.telemetryService.getTelemetryHistory(
      deviceId,
      query,
    );
    return {
      success: true,
      ...result,
    };
  }
}
