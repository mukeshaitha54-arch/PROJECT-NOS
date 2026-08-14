import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { FleetDashboardService } from "../services/fleet-dashboard.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentTenant } from "../../../common/decorators/current-tenant.decorator";
import { TenantContext } from "@nos/shared-types";

@Controller("fleet/dashboard")
@UseGuards(JwtAuthGuard)
export class FleetDashboardController {
  constructor(private readonly dashboardService: FleetDashboardService) {}

  @Get(":orgId/tree")
  async getOrganizationTree(
    @CurrentTenant() tenant: TenantContext,
    @Param("orgId") orgId: string,
  ) {
    // IDOR protection: ensure the param matches the authenticated tenant
    if (orgId !== tenant.organizationId) {
      throw new Error("Unauthorized cross-tenant access attempt");
    }
    const data = await this.dashboardService.getOrganizationTree(
      tenant.organizationId,
    );
    return {
      success: true,
      data,
    };
  }
}
