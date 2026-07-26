import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { INotificationRepository, NotificationCreateInput } from '../../common/repositories/notification.repository.interface';
import { NotificationLog } from '@prisma/client';

@Injectable()
export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: NotificationCreateInput): Promise<NotificationLog> {
    return this.prisma.notificationLog.create({
      data: {
        alertId: data.alertId,
        provider: data.provider as any,
        recipient: data.recipient,
        status: data.status,
        response: data.response || null,
        retryCount: data.retryCount || 0,
        isDlq: data.isDlq || false,
      },
    });
  }

  async findById(id: string): Promise<NotificationLog | null> {
    return this.prisma.notificationLog.findUnique({ where: { id } });
  }

  async findByAlertId(alertId: string): Promise<NotificationLog[]> {
    return this.prisma.notificationLog.findMany({
      where: { alertId },
      orderBy: { sentAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string, retryCount: number, isDlq = false, response?: string): Promise<NotificationLog> {
    const data: any = { status, retryCount, isDlq };
    if (response !== undefined) data.response = response;
    return this.prisma.notificationLog.update({
      where: { id },
      data,
    });
  }

  async findDlqLogs(skip = 0, take = 20): Promise<[NotificationLog[], number]> {
    const where = { isDlq: true };
    const [logs, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        skip,
        take,
        orderBy: { sentAt: 'desc' },
      }),
      this.prisma.notificationLog.count({ where }),
    ]);
    return [logs, total];
  }
}
