import { Injectable, Inject, Logger } from '@nestjs/common';
import { IAlertRepository } from '../../../common/repositories/alert.repository.interface';
import { AlertHistory, AlertComment } from '@prisma/client';

@Injectable()
export class AlertHistoryService {
  private readonly logger = new Logger(AlertHistoryService.name);

  constructor(@Inject(IAlertRepository) private readonly alertRepo: IAlertRepository) {}

  async recordAction(data: {
    alertId: string;
    action: string;
    performedBy: string;
    oldValue?: string;
    newValue?: string;
    ipAddress?: string;
    browser?: string;
    correlationId?: string;
    comment?: string;
  }): Promise<AlertHistory> {
    this.logger.log(`[Alert Audit] ${data.action} on alert ${data.alertId} by ${data.performedBy} (Correlation: ${data.correlationId || 'none'})`);
    return this.alertRepo.addHistory(data);
  }

  async addOperatorComment(data: {
    alertId: string;
    userId: string;
    userName: string;
    comment: string;
    isPrivate?: boolean;
  }): Promise<AlertComment> {
    const commentRecord = await this.alertRepo.addComment(data);
    // Automatically log comment creation to timeline audit
    await this.recordAction({
      alertId: data.alertId,
      action: data.isPrivate ? 'PRIVATE_NOTE_ADDED' : 'COMMENT_ADDED',
      performedBy: data.userName,
      comment: data.comment,
    });
    return commentRecord;
  }
}
