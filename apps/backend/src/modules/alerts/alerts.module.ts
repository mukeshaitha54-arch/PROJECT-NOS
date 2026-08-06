import { Module, Global } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuditModule } from '../audit/audit.module';

// Services
import { RuleEngineService } from './services/rule-engine.service';
import { AlertEngineService } from './services/alert-engine.service';
import { AlertHistoryService } from './services/alert-history.service';
import { MaintenanceService } from './services/maintenance.service';
import { AlertHealthService } from './services/alert-health.service';
import { NotificationService } from './notification/notification.service';
import { AlertRuleEngineService } from './alert-rule-engine.service';

// Phase 5 Final Hardening Services
import { RuleValidationService } from './services/rule-validation.service';
import { RuleSimulationService } from './services/rule-simulation.service';
import { RuleMetricsService } from './services/rule-metrics.service';
import { RuleHealthService } from './services/rule-health.service';
import { RuleAuditService } from './services/rule-audit.service';

// Queue & Workers
import { AlertQueueService } from './queues/queue.service';
import { EscalationWorker } from './queues/escalation.worker';

// Repository Interfaces
import { IAlertRepository } from '../../common/repositories/alert.repository.interface';
import { IAlertRuleRepository } from '../../common/repositories/alert-rule.repository.interface';
import { IAlertRuleAuditRepository } from '../../common/repositories/alert-rule-audit.repository.interface';
import { INotificationRepository } from '../../common/repositories/notification.repository.interface';
import { IMaintenanceRepository } from '../../common/repositories/maintenance.repository.interface';
import { ITelemetryRepositoryToken } from '../../common/repositories/telemetry.repository.interface';

// Repository Implementations
import { PrismaAlertRepository } from '../../database/repositories/prisma-alert.repository';
import { PrismaAlertRuleRepository } from '../../database/repositories/prisma-alert-rule.repository';
import { PrismaAlertRuleAuditRepository } from '../../database/repositories/prisma-alert-rule-audit.repository';
import { PrismaNotificationRepository } from '../../database/repositories/prisma-notification.repository';
import { PrismaMaintenanceRepository } from '../../database/repositories/prisma-maintenance.repository';
import { PrismaTelemetryRepository } from '../../database/repositories/prisma-telemetry.repository';

// Controllers
import { AlertsController } from './alerts.controller';
import { MaintenanceController } from './maintenance.controller';

@Global()
@Module({
  imports: [DatabaseModule, RealtimeModule, AuditModule],
  controllers: [AlertsController, MaintenanceController],
  providers: [
    // Core Services
    AlertEngineService,
    AlertHistoryService,
    MaintenanceService,
    AlertHealthService,
    NotificationService,
    AlertRuleEngineService,

    // Queue & Workers
    AlertQueueService,
    EscalationWorker,

    // Phase 5 Final Hardening Services (order matters: audit/metrics before engine)
    RuleAuditService,
    RuleMetricsService,
    RuleValidationService,
    RuleSimulationService,
    RuleHealthService,
    RuleEngineService,   // Last because it depends on audit + metrics

    // Repository Bindings
    { provide: IAlertRepository, useClass: PrismaAlertRepository },
    { provide: IAlertRuleRepository, useClass: PrismaAlertRuleRepository },
    { provide: IAlertRuleAuditRepository, useClass: PrismaAlertRuleAuditRepository },
    { provide: INotificationRepository, useClass: PrismaNotificationRepository },
    { provide: IMaintenanceRepository, useClass: PrismaMaintenanceRepository },
    { provide: ITelemetryRepositoryToken, useClass: PrismaTelemetryRepository },
  ],
  exports: [
    RuleEngineService,
    AlertEngineService,
    MaintenanceService,
    NotificationService,
    RuleAuditService,
    AlertRuleEngineService,
    IAlertRepository,
    IAlertRuleRepository,
    IMaintenanceRepository,
  ],
})
export class AlertsModule {}

