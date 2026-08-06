import { Alert, AlertHistory, AlertComment, AlertRule, Device } from '@prisma/client';
import { AlertSeverity, AlertStatus, AlertCategory } from '@nos/shared-types';

export interface AlertFindManyQuery {
  status?: AlertStatus;
  severity?: AlertSeverity;
  category?: AlertCategory;
  deviceId?: string;
  search?: string;
  tag?: string;
  assignedUserId?: string;
  skip?: number;
  take?: number;
  sortBy?: 'createdAt' | 'severity' | 'occurrenceCount';
  sortOrder?: 'asc' | 'desc';
}

export interface AlertOverviewStats {
  totalAlerts: number;
  openAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  acknowledgedAlerts: number;
  resolvedToday: number;
  repeatedIncidentCount: number;
}

export interface IAlertRepository {
  create(data: {
    incidentNumber: string;
    deviceId: string;
    ruleId?: string | null;
    parentAlertId?: string | null;
    title: string;
    description: string;
    severity: string;
    status?: string;
    category?: string;
    source?: string;
    fingerprint: string;
    riskScore?: number;
    confidenceScore?: string;
    recoveryTimerSeconds?: number | null;
    tags?: string[];
    runbookUrl?: string | null;
    assignedUserId?: string | null;
  }): Promise<Alert>;

  findById(id: string): Promise<(Alert & { rule?: AlertRule | null; device?: Device | null; comments?: AlertComment[]; history?: AlertHistory[]; childAlerts?: Alert[] }) | null>;
  
  findByFingerprint(fingerprint: string, openOnly?: boolean): Promise<Alert | null>;
  
  findMany(query: AlertFindManyQuery): Promise<[Alert[], number]>;
  
  update(id: string, data: Partial<Alert>): Promise<Alert>;
  
  incrementOccurrence(id: string): Promise<Alert>;
  
  addHistory(data: {
    alertId: string;
    action: string;
    performedBy: string;
    oldValue?: string;
    newValue?: string;
    ipAddress?: string;
    browser?: string;
    correlationId?: string;
    comment?: string;
  }): Promise<AlertHistory>;

  addComment(data: {
    alertId: string;
    userId: string;
    userName: string;
    comment: string;
    isPrivate?: boolean;
  }): Promise<AlertComment>;

  findOpenByDeviceId(deviceId: string): Promise<Alert[]>;
  
  findEscalationCandidates(maxOpenMinutes: number): Promise<Alert[]>;
  
  getOverviewStatistics(): Promise<AlertOverviewStats>;
  
  bulkUpdateStatus(alertIds: string[], status: string, timestamp?: Date): Promise<number>;
  
  delete(id: string): Promise<boolean>;
  
  search(query: string, organizationId: string): Promise<Alert[]>;
}

export const IAlertRepository = Symbol('IAlertRepository');
