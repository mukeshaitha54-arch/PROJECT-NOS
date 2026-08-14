import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../auth/guards/tenant.guard";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { TenantContext } from "@nos/shared-types";
import { InventorySearchService } from "./inventory-search.service";

@ApiTags("Inventory - Search Engine")
@Controller("inventory/search")
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class InventorySearchController {
  constructor(private readonly searchService: InventorySearchService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Search asset inventory by software name, publisher, version with pagination and tenant scoping",
  })
  async search(
    @CurrentTenant() tenant: TenantContext,
    @Query("q") q?: string,
    @Query("query") query?: string,
    @Query("category") category?: string,
    @Query("tab") tab?: string,
    @Query("deviceId") deviceId?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    const tenantId = tenant?.organizationId || "default-org";
    const searchTerm = q !== undefined ? q : query || "";
    const categoryTerm = category !== undefined ? category : tab || "SOFTWARE";
    const pageNum = Number(page) && Number(page) > 0 ? Number(page) : 1;
    const limitNum = Number(limit) && Number(limit) > 0 ? Number(limit) : 20;

    return this.searchService.search({
      tenantId,
      query: searchTerm,
      category: categoryTerm.toUpperCase(),
      deviceId,
      page: pageNum,
      limit: limitNum,
    });
  }
}
