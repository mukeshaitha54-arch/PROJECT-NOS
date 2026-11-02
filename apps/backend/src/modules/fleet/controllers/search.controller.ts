import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  UnauthorizedException,
} from "@nestjs/common";
import { SearchService } from "../services/search.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentTenant } from "../../../common/decorators/current-tenant.decorator";
import { TenantContext } from "@nos/shared-types";

@Controller("fleet/search")
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get(":orgId")
  async search(
    @Param("orgId") orgId: string,
    @Query("q") query: string,
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
    const results = await this.searchService.globalSearch(query, orgId);

    return {
      success: true,
      data: results,
    };
  }
}
