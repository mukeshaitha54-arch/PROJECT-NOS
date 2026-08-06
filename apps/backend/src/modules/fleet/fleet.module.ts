import { Module, forwardRef } from '@nestjs/common';
import { InstallerController } from './controllers/installer.controller';
import { OnboardingController } from './controllers/onboarding.controller';
import { RegistrationKeyController } from './controllers/registration-key.controller';
import { SearchController } from './controllers/search.controller';
import { FleetDashboardController } from './controllers/fleet-dashboard.controller';
import { SmartGroupController } from './controllers/smart-group.controller';
import { BulkOperationsController } from './controllers/bulk-operations.controller';
import { HierarchyController } from './controllers/hierarchy.controller';
import { RegistrationKeyService } from './services/registration-key.service';
import { SearchService } from './services/search.service';
import { FleetDashboardService } from './services/fleet-dashboard.service';
import { SmartGroupService } from './services/smart-group.service';
import { BulkOperationsService } from './services/bulk-operations.service';
import { HierarchyService } from './services/hierarchy.service';
import { DeviceModule } from '../device/device.module';
import { AuthModule } from '../auth/auth.module';
import { AlertsModule } from '../alerts/alerts.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [forwardRef(() => DeviceModule), AuthModule, AlertsModule, forwardRef(() => InventoryModule)],
  controllers: [
    InstallerController,
    OnboardingController,
    RegistrationKeyController,
    SearchController,
    FleetDashboardController,
    SmartGroupController,
    BulkOperationsController,
    HierarchyController,
  ],
  providers: [
    RegistrationKeyService,
    SearchService,
    FleetDashboardService,
    SmartGroupService,
    BulkOperationsService,
    HierarchyService,
    PrismaService,
  ],
  exports: [
    RegistrationKeyService,
    SearchService,
    FleetDashboardService,
    SmartGroupService,
    BulkOperationsService,
    HierarchyService,
  ],
})
export class FleetModule {}
