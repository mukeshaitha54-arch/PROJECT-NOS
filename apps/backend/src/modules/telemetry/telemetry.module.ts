import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { PrismaTelemetryRepository } from '../../database/repositories/prisma-telemetry.repository';
import { NoOpTelemetryPublisherService } from '../../common/services/noop-telemetry-publisher.service';
import { ITelemetryRepositoryToken } from '../../common/repositories/telemetry.repository.interface';
import { ITelemetryPublisherToken } from '../../common/services/telemetry-publisher.interface';
import { DeviceModule } from '../device/device.module';

@Module({
  imports: [DeviceModule],
  controllers: [TelemetryController],
  providers: [
    TelemetryService,
    { provide: ITelemetryRepositoryToken, useClass: PrismaTelemetryRepository },
    { provide: ITelemetryPublisherToken, useClass: NoOpTelemetryPublisherService },
  ],
  exports: [TelemetryService, ITelemetryRepositoryToken, ITelemetryPublisherToken],
})
export class TelemetryModule {}
