import { Module, forwardRef } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventorySearchController } from './inventory-search.controller';
import { InventoryService } from './inventory.service';
import { InventorySearchService } from './inventory-search.service';
import { InventoryCacheService } from './services/inventory-cache.service';
import { InventoryAuditService } from './services/inventory-audit.service';
import { IInventoryRepository } from '../../common/repositories/inventory.repository.interface';
import { PrismaInventoryRepository } from '../../database/repositories/prisma-inventory.repository';
import { DatabaseModule } from '../../database/database.module';
import { DeviceModule } from '../device/device.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => DeviceModule)],
  controllers: [InventoryController, InventorySearchController],
  providers: [
    InventoryService,
    InventorySearchService,
    InventoryCacheService,
    InventoryAuditService,
    {
      provide: IInventoryRepository,
      useClass: PrismaInventoryRepository,
    },
  ],
  exports: [InventoryService, InventorySearchService, IInventoryRepository],
})
export class InventoryModule {}

