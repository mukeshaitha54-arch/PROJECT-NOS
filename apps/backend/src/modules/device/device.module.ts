import { Module, forwardRef } from "@nestjs/common";
import { DeviceController } from "./device.controller";
import { DeviceTimelineController } from "./device-timeline.controller";
import { DeviceService } from "./device.service";
import { DeviceTimelineService } from "./services/device-timeline.service";
import { DeviceTimelineQueryService } from "./device-timeline.service";
import { TimelineHandler } from "./handlers/timeline.handler";
import { PrismaDeviceRepository } from "../../database/repositories/prisma-device.repository";
import { PrismaHeartbeatRepository } from "../../database/repositories/prisma-heartbeat.repository";
import { TokenDeviceAuthenticatorService } from "../../common/services/token-device-authenticator.service";
import { IDeviceRepositoryToken } from "../../common/repositories/device.repository.interface";
import { IHeartbeatRepositoryToken } from "../../common/repositories/heartbeat.repository.interface";
import { IDeviceAuthenticatorToken } from "../../common/services/device-authenticator.interface";
import { FleetModule } from "../fleet/fleet.module";

@Module({
  imports: [forwardRef(() => FleetModule)],
  controllers: [DeviceController, DeviceTimelineController],
  providers: [
    DeviceService,
    DeviceTimelineService,
    DeviceTimelineQueryService,
    TimelineHandler,
    { provide: IDeviceRepositoryToken, useClass: PrismaDeviceRepository },
    { provide: IHeartbeatRepositoryToken, useClass: PrismaHeartbeatRepository },
    {
      provide: IDeviceAuthenticatorToken,
      useClass: TokenDeviceAuthenticatorService,
    },
  ],
  exports: [
    DeviceService,
    DeviceTimelineService,
    DeviceTimelineQueryService,
    IDeviceRepositoryToken,
    IHeartbeatRepositoryToken,
    IDeviceAuthenticatorToken,
  ],
})
export class DeviceModule {}
