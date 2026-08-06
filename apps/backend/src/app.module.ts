import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from './config/config.module';
import { GracefulShutdownService } from './common/lifecycle/graceful-shutdown.service';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DeviceModule } from './modules/device/device.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { AuditModule } from './modules/audit/audit.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot({ global: true }),
    ScheduleModule.forRoot(),
    // Enterprise multi-tier rate limiting
    // Tier 1 — default:    100 req/60s  (general API)
    // Tier 2 — auth:         5 req/60s  (login, register, forgot-password)
    // Tier 3 — telemetry: 1000 req/60s  (agent telemetry ingest)
    ThrottlerModule.forRoot([
      { name: 'default',   ttl: 60000, limit: 100 },
      { name: 'auth',      ttl: 60000, limit: 5000 },
      { name: 'telemetry', ttl: 60000, limit: 1000 },
    ]),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    DeviceModule,
    TelemetryModule,
    DashboardModule,
    InventoryModule,
    RealtimeModule,
    AlertsModule,
    TenantModule,
    FleetModule,
    AuditModule,
  ],
  controllers: [],


  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    GracefulShutdownService,
  ],
})
export class AppModule {}
