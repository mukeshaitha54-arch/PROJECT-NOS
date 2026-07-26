import { NotificationLog } from '@prisma/client';

export interface NotificationCreateInput {
  alertId: string;
  provider: string;
  recipient: string;
  status: string;
  response?: string;
  retryCount?: number;
  isDlq?: boolean;
}

export interface INotificationRepository {
  create(data: NotificationCreateInput): Promise<NotificationLog>;
  findById(id: string): Promise<NotificationLog | null>;
  findByAlertId(alertId: string): Promise<NotificationLog[]>;
  updateStatus(id: string, status: string, retryCount: number, isDlq?: boolean, response?: string): Promise<NotificationLog>;
  findDlqLogs(skip?: number, take?: number): Promise<[NotificationLog[], number]>;
}

export const INotificationRepository = Symbol('INotificationRepository');
