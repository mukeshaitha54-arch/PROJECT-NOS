import { Controller, Get, Query, UseGuards, Param } from "@nestjs/common";
import { SearchService } from "../services/search.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";

@Controller("fleet/search")
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get(":orgId")
  async search(@Param("orgId") orgId: string, @Query("q") query: string) {
    const results = await this.searchService.globalSearch(query, orgId);

    return {
      success: true,
      data: results,
    };
  }
}
