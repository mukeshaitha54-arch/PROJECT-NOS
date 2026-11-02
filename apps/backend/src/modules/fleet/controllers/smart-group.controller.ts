import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import {
  SmartGroupService,
  CreateSmartGroupDto,
} from "../services/smart-group.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentTenant } from "../../../common/decorators/current-tenant.decorator";
import { TenantContext } from "@nos/shared-types";

@Controller("fleet/smart-groups")
@UseGuards(JwtAuthGuard)
export class SmartGroupController {
  constructor(private readonly smartGroupService: SmartGroupService) {}

  @Post()
  async createGroup(
    @Body() dto: CreateSmartGroupDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    if (
      tenant.organizationId &&
      tenant.organizationId !== "default-org" &&
      dto.organizationId !== tenant.organizationId
    ) {
      throw new UnauthorizedException(
        "Unauthorized cross-tenant group creation",
      );
    }
    const data = await this.smartGroupService.createGroup(dto);
    return {
      success: true,
      data,
    };
  }

  @Get("organization/:orgId")
  async getGroups(
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
    const data = await this.smartGroupService.getGroups(orgId);
    return {
      success: true,
      data,
    };
  }

  @Get(":id/evaluate")
  async evaluateGroup(
    @Param("id") id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const group = await this.smartGroupService.getGroupById(id);
    if (
      tenant.organizationId &&
      tenant.organizationId !== "default-org" &&
      group?.organizationId &&
      group.organizationId !== tenant.organizationId
    ) {
      throw new UnauthorizedException(
        "Unauthorized cross-tenant group evaluation attempt",
      );
    }
    const devices = await this.smartGroupService.evaluateGroup(id);
    return {
      success: true,
      data: {
        count: devices.length,
        devices,
      },
    };
  }
}
