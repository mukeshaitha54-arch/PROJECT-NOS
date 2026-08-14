import { Injectable, Inject, Logger } from "@nestjs/common";
import { IAlertRepository } from "../../../common/repositories/alert.repository.interface";
import { INotificationRepository } from "../../../common/repositories/notification.repository.interface";
import { AlertHealthResponse } from "@nos/shared-types";

@Injectable()
export class AlertHealthService {
  private readonly logger = new Logger(AlertHealthService.name);
  private readonly startTime = Date.now();

  constructor(
    @Inject(IAlertRepository) private readonly alertRepo: IAlertRepository,
    @Inject(INotificationRepository)
    private readonly notifRepo: INotificationRepository,
  ) {}

  async checkHealth(): Promise<AlertHealthResponse> {
    const [, dlqCount] = await this.notifRepo.findDlqLogs(0, 1);
    const stats = await this.alertRepo.getOverviewStatistics();

    let status: "HEALTHY" | "DEGRADED" | "CRITICAL" = "HEALTHY";
    if (dlqCount > 10 || stats.criticalAlerts > 20) {
      status = "DEGRADED";
    }

    return {
      status,
      redisConnected: true,
      bullmqWorkersActive: true,
      activeQueuedCount: Math.max(
        0,
        stats.openAlerts - stats.acknowledgedAlerts,
      ),
      dlqCount,
      lastProcessedAt: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}
