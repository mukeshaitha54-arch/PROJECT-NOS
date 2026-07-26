import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryCacheService } from './services/inventory-cache.service';
import { InventoryAuditService } from './services/inventory-audit.service';
import { IInventoryRepository } from '../../common/repositories/inventory.repository.interface';
import { PrismaInventoryRepository } from '../../database/repositories/prisma-inventory.repository';
import { DatabaseModule } from '../../database/database.module';
import { DeviceModule } from '../device/device.module';

@Module({
  imports: [DatabaseModule, DeviceModule],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryCacheService,
    InventoryAuditService,
    {
      provide: IInventoryRepository,
      useClass: PrismaInventoryRepository,
    },
  ],
  exports: [InventoryService, IInventoryRepository],
})
export class InventoryModule {}
