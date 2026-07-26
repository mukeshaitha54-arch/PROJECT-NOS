import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  IAlertRuleAuditRepository,
  AlertRuleAuditCreateInput,
} from '../../common/repositories/alert-rule-audit.repository.interface';
import { AlertRuleAuditLog } from '@prisma/client';

@Injectable()
export class PrismaAlertRuleAuditRepository implements IAlertRuleAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: AlertRuleAuditCreateInput): Promise<AlertRuleAuditLog> {
    return this.prisma.alertRuleAuditLog.create({
      data: {
        ruleId: data.ruleId,
        action: data.action,
        field: data.field || null,
        oldValue: data.oldValue || null,
        newValue: data.newValue || null,
        version: data.version,
        performedBy: data.performedBy,
        reason: data.reason || null,
        correlationId: data.correlationId || null,
        ipAddress: data.ipAddress || null,
        browser: data.browser || null,
      },
    });
  }

  async findByRuleId(ruleId: string, skip = 0, take = 50): Promise<[AlertRuleAuditLog[], number]> {
    const [data, total] = await Promise.all([
      this.prisma.alertRuleAuditLog.findMany({
        where: { ruleId },
        orderBy: { timestamp: 'desc' },
        skip,
        take,
      }),
      this.prisma.alertRuleAuditLog.count({ where: { ruleId } }),
    ]);
    return [data, total];
  }

  async findByAction(action: string, skip = 0, take = 50): Promise<[AlertRuleAuditLog[], number]> {
    const [data, total] = await Promise.all([
      this.prisma.alertRuleAuditLog.findMany({
        where: { action },
        orderBy: { timestamp: 'desc' },
        skip,
        take,
      }),
      this.prisma.alertRuleAuditLog.count({ where: { action } }),
    ]);
    return [data, total];
  }

  async findByPerformedBy(performedBy: string, skip = 0, take = 50): Promise<[AlertRuleAuditLog[], number]> {
    const [data, total] = await Promise.all([
      this.prisma.alertRuleAuditLog.findMany({
        where: { performedBy: { contains: performedBy, mode: 'insensitive' } },
        orderBy: { timestamp: 'desc' },
        skip,
        take,
      }),
      this.prisma.alertRuleAuditLog.count({
        where: { performedBy: { contains: performedBy, mode: 'insensitive' } },
      }),
    ]);
    return [data, total];
  }
}
