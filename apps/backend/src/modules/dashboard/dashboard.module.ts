import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { IDashboardRepository } from "../../common/repositories/dashboard.repository.interface";
import { PrismaDashboardRepository } from "../../database/repositories/prisma-dashboard.repository";
import { DatabaseModule } from "../../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    {
      provide: IDashboardRepository,
      useClass: PrismaDashboardRepository,
    },
  ],
  exports: [DashboardService, IDashboardRepository],
})
export class DashboardModule {}
