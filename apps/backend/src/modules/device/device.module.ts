import { Module } from '@nestjs/common';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { PrismaDeviceRepository } from '../../database/repositories/prisma-device.repository';
import { PrismaHeartbeatRepository } from '../../database/repositories/prisma-heartbeat.repository';
import { TokenDeviceAuthenticatorService } from '../../common/services/token-device-authenticator.service';
import { IDeviceRepositoryToken } from '../../common/repositories/device.repository.interface';
import { IHeartbeatRepositoryToken } from '../../common/repositories/heartbeat.repository.interface';
import { IDeviceAuthenticatorToken } from '../../common/services/device-authenticator.interface';

@Module({
  controllers: [DeviceController],
  providers: [
    DeviceService,
    { provide: IDeviceRepositoryToken, useClass: PrismaDeviceRepository },
    { provide: IHeartbeatRepositoryToken, useClass: PrismaHeartbeatRepository },
    { provide: IDeviceAuthenticatorToken, useClass: TokenDeviceAuthenticatorService },
  ],
  exports: [DeviceService, IDeviceRepositoryToken, IHeartbeatRepositoryToken, IDeviceAuthenticatorToken],
})
export class DeviceModule {}
