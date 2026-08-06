import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { TelemetryAggregationService } from './telemetry-aggregation.service';
import { TelemetryCronService } from './telemetry-cron.service';
import { TelemetryRetentionService } from './telemetry-retention.service';
import { PrismaTelemetryRepository } from '../../database/repositories/prisma-telemetry.repository';
import { NoOpTelemetryPublisherService } from '../../common/services/noop-telemetry-publisher.service';
import { ITelemetryRepositoryToken } from '../../common/repositories/telemetry.repository.interface';
import { ITelemetryPublisherToken } from '../../common/services/telemetry-publisher.interface';
import { DeviceModule } from '../device/device.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DeviceModule, DatabaseModule],
  controllers: [TelemetryController],
  providers: [
    TelemetryService,
    TelemetryAggregationService,
    TelemetryCronService,
    TelemetryRetentionService,
    { provide: ITelemetryRepositoryToken, useClass: PrismaTelemetryRepository },
    { provide: ITelemetryPublisherToken, useClass: NoOpTelemetryPublisherService },
  ],
  exports: [
    TelemetryService,
    TelemetryAggregationService,
    TelemetryRetentionService,
    ITelemetryRepositoryToken,
    ITelemetryPublisherToken,
  ],
})
export class TelemetryModule {}
