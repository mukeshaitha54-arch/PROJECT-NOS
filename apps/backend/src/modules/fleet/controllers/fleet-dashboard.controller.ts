import {
  Controller,
  Get,
  Param,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import { FleetDashboardService } from "../services/fleet-dashboard.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentTenant } from "../../../common/decorators/current-tenant.decorator";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { TenantContext } from "@nos/shared-types";
import { PrismaService } from "../../../database/prisma.service";

@Controller("fleet/dashboard")
@UseGuards(JwtAuthGuard)
export class FleetDashboardController {
  constructor(
    private readonly dashboardService: FleetDashboardService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(":orgId/tree")
  async getOrganizationTree(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: any,
    @Param("orgId") orgId: string,
  ) {
    let effectiveOrgId = tenant.organizationId;
    if (orgId !== tenant.organizationId) {
      if (user?.role === "SUPER_ADMIN") {
        effectiveOrgId = orgId;
      } else {
        const member = await this.prisma.organizationMember.findFirst({
          where: {
            userId: user.id,
            organizationId: orgId,
            isSuspended: false,
          },
        });
        if (!member) {
          throw new ForbiddenException(
            "Unauthorized cross-tenant access attempt",
          );
        }
        effectiveOrgId = orgId;
      }
    }
    const data =
      await this.dashboardService.getOrganizationTree(effectiveOrgId);
    return {
      success: true,
      data,
    };
  }
}
