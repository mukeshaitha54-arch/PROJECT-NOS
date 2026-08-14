import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import {
  SmartGroupService,
  CreateSmartGroupDto,
} from "../services/smart-group.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";

@Controller("fleet/smart-groups")
@UseGuards(JwtAuthGuard)
export class SmartGroupController {
  constructor(private readonly smartGroupService: SmartGroupService) {}

  @Post()
  async createGroup(@Body() dto: CreateSmartGroupDto) {
    const data = await this.smartGroupService.createGroup(dto);
    return {
      success: true,
      data,
    };
  }

  @Get("organization/:orgId")
  async getGroups(@Param("orgId") orgId: string) {
    const data = await this.smartGroupService.getGroups(orgId);
    return {
      success: true,
      data,
    };
  }

  @Get(":id/evaluate")
  async evaluateGroup(@Param("id") id: string) {
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
