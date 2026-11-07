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
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { TenantContext } from "@nos/shared-types";
import { AuditLogsService } from "./audit-logs.service";

@ApiTags("Audit Logs & Compliance Engine")
@Controller("audit")
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class AuditLogsController {
  constructor(private readonly auditService: AuditLogsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Retrieve paginated enterprise audit trail filtered by action, actor, or date range",
  })
  async getAuditLogs(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user?: any,
    @Query("action") action?: string,
    @Query("actor") actor?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    const isSuperAdmin = user?.role === "SUPER_ADMIN";
    const tenantId = isSuperAdmin
      ? undefined
      : user?.organizationId || tenant?.organizationId;
    const pageNum = Number(page) && Number(page) > 0 ? Number(page) : 1;
    const limitNum = Number(limit) && Number(limit) > 0 ? Number(limit) : 20;

    return this.auditService.getAuditLogs({
      tenantId: tenantId || "impossible-org",
      action,
      actor,
      startDate,
      endDate,
      page: pageNum,
      limit: limitNum,
    });
  }
}
