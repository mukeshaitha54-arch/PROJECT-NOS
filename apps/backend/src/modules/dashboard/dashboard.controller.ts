import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import {
  DashboardDevicesQueryDto,
  DashboardHistoryQueryDto,
} from "./dto/dashboard.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { TenantContext } from "@nos/shared-types";
import {
  ApiResponse,
  DashboardOverviewResponse,
  PaginatedDashboardDevicesResponse,
  DashboardDeviceDetailResponse,
  PaginatedTelemetryResponse,
} from "@nos/shared-types";

@ApiTags("Dashboard - Operational Monitoring")
@Controller("dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("overview")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Retrieve high-level device infrastructure summary stats",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "Operational monitoring overview returned successfully.",
  })
  async getOverview(
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<DashboardOverviewResponse>> {
    const data = await this.dashboardService.getOverview(tenant.organizationId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get("devices")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Retrieve paginated and filterable operational device table records",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "Paginated device table returned successfully.",
  })
  async getDevices(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: DashboardDevicesQueryDto,
  ): Promise<ApiResponse<PaginatedDashboardDevicesResponse>> {
    const data = await this.dashboardService.getDevices(
      tenant.organizationId,
      query,
    );
    return {
      success: true,
      data,
      meta: {
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get("device/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Retrieve comprehensive real-time device diagnostic profile",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "Device operational detail retrieved successfully.",
  })
  @SwaggerApiResponse({
    status: 404,
    description: "Target device identifier not found.",
  })
  async getDeviceById(
    @CurrentTenant() tenant: TenantContext,
    @Param("id") id: string,
  ): Promise<ApiResponse<DashboardDeviceDetailResponse>> {
    const data = await this.dashboardService.getDeviceById(
      tenant.organizationId,
      id,
    );
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get("history/:deviceId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Retrieve historical raw time-series telemetry snapshots within custom date range",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "Paginated historical telemetry retrieved successfully.",
  })
  async getDeviceHistory(
    @CurrentTenant() tenant: TenantContext,
    @Param("deviceId") deviceId: string,
    @Query() query: DashboardHistoryQueryDto,
  ): Promise<ApiResponse<PaginatedTelemetryResponse>> {
    const data = await this.dashboardService.getDeviceHistory(
      tenant.organizationId,
      deviceId,
      query,
    );
    return {
      success: true,
      data,
      meta: {
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
