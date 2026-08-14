import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiHeader,
  ApiParam,
} from "@nestjs/swagger";
import { InventoryService } from "./inventory.service";
import {
  SubmitInventoryRequestDto,
  InventoryQueryDto,
} from "./dto/inventory.dto";
import { DeviceAuthGuard } from "../device/guards/device-auth.guard";
import { CurrentDevice } from "../device/decorators/current-device.decorator";
import { Device } from "@prisma/client";
import {
  ApiResponse,
  CompleteInventoryResponse,
  HardwareInventoryResponse,
  SoftwareInventoryResponse,
  NetworkInventoryResponse,
  SecurityInventoryResponse,
  InventoryHealthResponse,
} from "@nos/shared-types";

@ApiTags("Inventory - Asset & Discovery Engine")
@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(DeviceAuthGuard)
  @ApiOperation({
    summary: "Upload comprehensive device asset inventory",
    description:
      "Ingests hardware, installed software, Windows services, startup applications, security state, and system capabilities. Protected via X-Device-Token.",
  })
  @ApiHeader({
    name: "X-Device-Token",
    required: true,
    description: "Cryptographic device authentication token",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "Inventory successfully validated and persisted.",
  })
  @SwaggerApiResponse({
    status: 401,
    description: "Invalid or missing X-Device-Token.",
  })
  @SwaggerApiResponse({
    status: 503,
    description: "Inventory engine disabled via feature flags.",
  })
  async submitInventory(
    @CurrentDevice() device: Device,
    @Body() dto: SubmitInventoryRequestDto,
  ): Promise<ApiResponse<CompleteInventoryResponse>> {
    const data = await this.inventoryService.submitInventory(
      dto,
      device?.id || dto.deviceId,
    );
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get("health")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Retrieve inventory diagnostic health and freshness metrics",
    description:
      "Returns versioning, agent compliance, and scan freshness diagnostics across the enterprise topology.",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "Diagnostic health data returned successfully.",
  })
  async getHealth(): Promise<ApiResponse<InventoryHealthResponse>> {
    const data = await this.inventoryService.getHealthDiagnostics();
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get("hardware/:deviceId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Retrieve hardware asset specification (CPU, Motherboard, RAM, Disks, GPUs)",
  })
  @ApiParam({
    name: "deviceId",
    required: true,
    description: "Target Node Primary Key UUID",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "Hardware inventory returned successfully.",
  })
  async getHardware(
    @Param("deviceId") deviceId: string,
  ): Promise<ApiResponse<HardwareInventoryResponse>> {
    const data = await this.inventoryService.getHardwareInventory(deviceId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get("software/:deviceId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Retrieve paginated installed software, Windows services, and startup applications",
  })
  @ApiParam({
    name: "deviceId",
    required: true,
    description: "Target Node Primary Key UUID",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "Software and service inventory returned successfully.",
  })
  async getSoftware(
    @Param("deviceId") deviceId: string,
    @Query() query: InventoryQueryDto,
  ): Promise<ApiResponse<SoftwareInventoryResponse>> {
    const data = await this.inventoryService.getSoftwareInventory(
      deviceId,
      query,
    );
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get("network/:deviceId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Retrieve network interface parameters and active IP configurations",
  })
  @ApiParam({
    name: "deviceId",
    required: true,
    description: "Target Node Primary Key UUID",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "Network adapter inventory returned successfully.",
  })
  async getNetwork(
    @Param("deviceId") deviceId: string,
  ): Promise<ApiResponse<NetworkInventoryResponse>> {
    const data = await this.inventoryService.getNetworkInventory(deviceId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get("security/:deviceId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Retrieve hardware security compliance and system virtualization capability flags",
  })
  @ApiParam({
    name: "deviceId",
    required: true,
    description: "Target Node Primary Key UUID",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "Security and capability inventory returned successfully.",
  })
  async getSecurity(
    @Param("deviceId") deviceId: string,
  ): Promise<ApiResponse<SecurityInventoryResponse>> {
    const data = await this.inventoryService.getSecurityInventory(deviceId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Post("scan/:deviceId")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Trigger manual inventory diagnostic re-scan for a monitored node",
    description:
      "Records scan invocation request in control plane audit log. Future monitoring agents will consume and execute without direct remote shelling.",
  })
  @ApiParam({
    name: "deviceId",
    required: true,
    description: "Target Node Primary Key UUID",
  })
  @SwaggerApiResponse({
    status: 202,
    description: "Scan request scheduled successfully.",
  })
  async triggerScan(
    @Param("deviceId") deviceId: string,
  ): Promise<
    ApiResponse<{ deviceId: string; status: string; message: string }>
  > {
    const data = await this.inventoryService.triggerManualScan(deviceId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(":deviceId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Retrieve complete asset profile and recent audit difference logs",
  })
  @ApiParam({
    name: "deviceId",
    required: true,
    description: "Target Node Primary Key UUID",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "Complete device inventory profile returned successfully.",
  })
  async getCompleteInventory(
    @Param("deviceId") deviceId: string,
  ): Promise<ApiResponse<CompleteInventoryResponse>> {
    const data = await this.inventoryService.getCompleteInventory(deviceId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
