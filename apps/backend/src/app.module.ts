import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from './config/config.module';
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
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

@Module({
  imports: [
    ConfigModule,
    // Production structured JSON logger powered by Pino
    LoggerModule.forRoot({
      pinoHttp: {
        customProps: (req) => ({
          correlationId: req.headers['x-request-id'] || req.headers['x-correlation-id'],
        }),
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:standard',
                },
              }
            : undefined,
        autoLogging: true,
      },
    }),
    // Rate limiting foundation (Prepared for in-memory / Redis expansion)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // Max requests per window
      },
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
  ],
})
export class AppModule {}
