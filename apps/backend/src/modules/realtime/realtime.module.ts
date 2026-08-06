import { Module, Global } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealtimeController } from './realtime.controller';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { SocketPublisherService } from './services/socket-publisher.service';
import { ConnectionRegistryService } from './services/connection-registry.service';
import { PresenceService } from './services/presence.service';
import { HeartbeatPresenceService } from './services/heartbeat-presence.service';
import { SocketMetricsService } from './services/socket-metrics.service';
import { SocketRateLimiterService } from './services/socket-rate-limiter.service';
import { RealtimeHandler } from './handlers/realtime.handler';
import { ISocketPublisherToken } from '../../common/services/socket-publisher.interface';
import { ISocketEventBusToken } from '../../common/services/socket-event-bus.interface';
import { LocalSocketEventBusService } from '../../common/services/local-socket-event-bus.service';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [RealtimeController],
  providers: [
    RealtimeGateway,
    RealtimeService,
    SocketPublisherService,
    {
      provide: ISocketPublisherToken,
      useExisting: SocketPublisherService,
    },
    {
      provide: ISocketEventBusToken,
      useClass: LocalSocketEventBusService,
    },
    ConnectionRegistryService,
    PresenceService,
    HeartbeatPresenceService,
    SocketMetricsService,
    SocketRateLimiterService,
    RealtimeHandler,
  ],
  exports: [
    RealtimeGateway,
    ISocketPublisherToken,
    ISocketEventBusToken,
    ConnectionRegistryService,
    PresenceService,
    HeartbeatPresenceService,
    SocketMetricsService,
    SocketPublisherService,
  ],
})
export class RealtimeModule {}

