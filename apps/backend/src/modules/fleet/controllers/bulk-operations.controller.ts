import {
  Controller,
  Post,
  Body,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import {
  BulkOperationsService,
  BulkActionDto,
} from "../services/bulk-operations.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";

@Controller("fleet/bulk")
@UseGuards(JwtAuthGuard)
export class BulkOperationsController {
  constructor(private readonly bulkService: BulkOperationsService) {}

  @Post("action")
  async executeAction(
    @Body() dto: Omit<BulkActionDto, "performedByUserId">,
    @CurrentUser() user: any,
  ) {
    const userOrgId = user?.organizationId || user?.organization?.id;
    if (
      userOrgId &&
      userOrgId !== "default-org" &&
      dto.organizationId &&
      dto.organizationId !== userOrgId &&
      user?.role !== "SUPER_ADMIN"
    ) {
      throw new UnauthorizedException(
        "Unauthorized cross-tenant bulk action attempt",
      );
    }

    const result = await this.bulkService.executeBulkAction({
      ...dto,
      performedByUserId: user.id,
    });

    return {
      success: true,
      message: `Bulk operation ${dto.action} completed successfully.`,
      data: result,
    };
  }
}
