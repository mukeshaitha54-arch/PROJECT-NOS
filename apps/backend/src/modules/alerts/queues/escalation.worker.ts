import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { IAlertRepository } from '../../../common/repositories/alert.repository.interface';
import { AlertHistoryService } from '../services/alert-history.service';
import { ISocketPublisher, ISocketPublisherToken } from '../../../common/services/socket-publisher.interface';
import { SocketEvents, AlertSeverity } from '@nos/shared-types';

@Injectable()
export class EscalationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EscalationWorker.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @Inject(IAlertRepository) private readonly alertRepo: IAlertRepository,
    private readonly historyService: AlertHistoryService,
    @Inject(ISocketPublisherToken) private readonly socketPublisher: ISocketPublisher,
  ) {}

  onModuleInit() {
    // Run automated escalation inspection every 60 seconds (unref for clean build/test exit)
    this.timer = setInterval(() => this.runEscalationCycle(), 60_000);
    if (this.timer.unref) this.timer.unref();
    this.logger.log(`[Escalation Worker] Activated 10m/20m/40m SLA automated escalation pipeline.`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Evaluates Open alerts against strict enterprise SLAs:
   * @ 10 min -> Assign L1 Operator
   * @ 20 min -> Assign Senior System Admin
   * @ 40 min -> Promote severity to CRITICAL
   */
  async runEscalationCycle(): Promise<number> {
    try {
      const candidates = await this.alertRepo.findEscalationCandidates(10); // at least 10 min old
      const nowMs = Date.now();
      let escalatedCount = 0;

      for (const alert of candidates) {
        const elapsedMinutes = (nowMs - new Date(alert.firstOccurred).getTime()) / 60_000;

        if (elapsedMinutes >= 40 && alert.severity !== 'CRITICAL') {
          const updated = await this.alertRepo.update(alert.id, { severity: AlertSeverity.CRITICAL as any });
          await this.historyService.recordAction({
            alertId: alert.id,
            action: 'AUTO_ESCALATION_CRITICAL',
            performedBy: 'EscalationWorker',
            oldValue: alert.severity,
            newValue: 'CRITICAL',
            comment: `Unresolved for ${Math.round(elapsedMinutes)} minutes. Automatically promoted to CRITICAL SLA status.`,
          });
          this.socketPublisher.emitAlertEvent(SocketEvents.ALERT_ESCALATED as any, { alert: updated, eventType: 'ESCALATED', timestamp: new Date().toISOString() });
          escalatedCount++;
        } else if (elapsedMinutes >= 20 && elapsedMinutes < 40 && (!alert.assignedUserId || alert.assignedUserId !== 'admin-pool')) {
          await this.alertRepo.update(alert.id, { assignedUserId: 'admin-pool' });
          await this.historyService.recordAction({
            alertId: alert.id,
            action: 'AUTO_ASSIGN_ADMIN',
            performedBy: 'EscalationWorker',
            comment: `Unacknowledged after 20 minutes. Escalated assignment to Senior System Admins.`,
          });
          escalatedCount++;
        } else if (elapsedMinutes >= 10 && elapsedMinutes < 20 && !alert.assignedUserId) {
          await this.alertRepo.update(alert.id, { assignedUserId: 'operator-pool' });
          await this.historyService.recordAction({
            alertId: alert.id,
            action: 'AUTO_ASSIGN_OPERATOR',
            performedBy: 'EscalationWorker',
            comment: `Open for >10 minutes. Assigned to standby Level 1 Operators pool.`,
          });
          escalatedCount++;
        }
      }

      if (escalatedCount > 0) {
        this.logger.log(`[Escalation Worker] Processed ${escalatedCount} automated SLA escalations across active alerts.`);
      }
      return escalatedCount;
    } catch (err: any) {
      this.logger.error(`[Escalation Worker] Cycle failure: ${err?.message}`);
      return 0;
    }
  }
}
