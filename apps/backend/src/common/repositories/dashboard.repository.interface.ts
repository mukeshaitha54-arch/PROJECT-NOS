import { DeviceStatus } from '@nos/shared-types';

export const IDashboardRepository = Symbol('IDashboardRepository');

export interface DashboardOverviewCounts {
  total: number;
  online: number;
  offline: number;
  critical: number;
  warning: number;
  degraded: number;
  maintenance: number;
}

export interface DeviceRowRaw {
  id: string;
  uuid: string;
  hostname: string;
  status: DeviceStatus | string;
  lastSeen: Date | null;
  os: string;
  osVersion: string;
  agentVersion: string;
  latestSnapshot: {
    cpuUsage: number;
    memoryUsagePercent: number;
    diskUsagePercent: number;
    networkUploadSpeed: number;
    networkDownloadSpeed: number;
    ipAddress: string;
    activeConnections: number;
  } | null;
  latestHeartbeat: {
    cpuUsage: number;
    ramUsage: number;
    ipAddress: string;
    uptime: number;
  } | null;
}

export interface DeviceDetailRaw {
  device: any;
  currentSnapshot: any | null;
  latestHeartbeat: any | null;
}

export interface TelemetryHistoryRaw {
  snapshots: any[];
  total: number;
}

export interface IDashboardRepository {
  getOverviewCounts(): Promise<DashboardOverviewCounts>;
  
  getDeviceRows(params: {
    skip: number;
    take: number;
    search?: string;
    status?: string;
    os?: string;
  }): Promise<{ devices: DeviceRowRaw[]; total: number }>;

  getDeviceDetail(deviceId: string): Promise<DeviceDetailRaw | null>;

  getTelemetryHistory(
    deviceId: string,
    params: {
      from?: Date;
      to?: Date;
      skip: number;
      take: number;
    },
  ): Promise<TelemetryHistoryRaw>;
}
