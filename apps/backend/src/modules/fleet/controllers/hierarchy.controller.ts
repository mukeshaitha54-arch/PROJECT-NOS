import {
  Controller,
  Get,
  Param,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import { HierarchyService } from "../services/hierarchy.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentTenant } from "../../../common/decorators/current-tenant.decorator";
import { TenantContext } from "@nos/shared-types";

@Controller("fleet/hierarchy")
@UseGuards(JwtAuthGuard)
export class HierarchyController {
  constructor(private readonly hierarchyService: HierarchyService) {}

  @Get(":orgId")
  async getHierarchy(
    @Param("orgId") orgId: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    if (
      tenant.organizationId &&
      tenant.organizationId !== "default-org" &&
      orgId !== tenant.organizationId
    ) {
      throw new UnauthorizedException(
        "Unauthorized cross-tenant access attempt",
      );
    }
    const data = await this.hierarchyService.getHierarchy(orgId);

    return {
      success: true,
      data,
    };
  }
}
