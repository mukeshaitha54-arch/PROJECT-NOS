import { MaintenanceWindow } from '@prisma/client';

export interface MaintenanceWindowCreateInput {
  deviceId?: string | null;
  deviceGroupId?: string | null;
  title: string;
  startTime: Date;
  endTime: Date;
  reason: string;
  type?: string; // SCHEDULED | EMERGENCY | RECURRING
  enabled?: boolean;
}

export interface IMaintenanceRepository {
  create(data: MaintenanceWindowCreateInput): Promise<MaintenanceWindow>;
  findById(id: string): Promise<MaintenanceWindow | null>;
  findActiveByDevice(deviceId: string, atTime?: Date): Promise<MaintenanceWindow[]>;
  findMany(enabledOnly?: boolean): Promise<MaintenanceWindow[]>;
  update(id: string, data: Partial<MaintenanceWindow>): Promise<MaintenanceWindow>;
  delete(id: string): Promise<boolean>;
}

export const IMaintenanceRepository = Symbol('IMaintenanceRepository');
