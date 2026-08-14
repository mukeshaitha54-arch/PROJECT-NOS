import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { HierarchyService } from "../services/hierarchy.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";

@Controller("fleet/hierarchy")
@UseGuards(JwtAuthGuard)
export class HierarchyController {
  constructor(private readonly hierarchyService: HierarchyService) {}

  @Get(":orgId")
  async getHierarchy(@Param("orgId") orgId: string) {
    const data = await this.hierarchyService.getHierarchy(orgId);

    return {
      success: true,
      data,
    };
  }
}
