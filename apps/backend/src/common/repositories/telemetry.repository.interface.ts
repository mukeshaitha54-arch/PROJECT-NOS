import { TelemetrySnapshot as PrismaTelemetrySnapshot } from '@prisma/client';

export interface TelemetryCreateInput {
  deviceId: string;
  cpuUsage: number;
  cpuTemperature: number;
  cpuFrequency: number;
  logicalProcessors: number;
  physicalProcessors: number;
  memoryUsed: number;
  memoryFree: number;
  memoryTotal: number;
  memoryUsagePercent: number;
  diskReadSpeed: number;
  diskWriteSpeed: number;
  diskUsagePercent: number;
  diskFree: number;
  diskTotal: number;
  networkUploadSpeed: number;
  networkDownloadSpeed: number;
  bytesSent: number;
  bytesReceived: number;
  activeConnections: number;
  runningProcesses: number;
  systemUptime: number;
  bootTime: Date;
  ipAddress: string;
  macAddress: string;
  timestamp?: Date;
}

export interface TelemetryRangeQuery {
  deviceId: string;
  from?: Date;
  to?: Date;
  skip?: number;
  take?: number;
}

export interface TelemetryAggregationResult {
  deviceId: string;
  avgCpuUsage: number;
  avgMemoryUsage: number;
  avgDiskUsage: number;
  sampleCount: number;
}

/**
 * Clean Architecture Repository Abstraction for Telemetry Domain.
 * Ensures services never interact directly with ORM specific queries.
 */
export interface ITelemetryRepository {
  create(data: TelemetryCreateInput): Promise<PrismaTelemetrySnapshot>;
  findLatest(deviceId: string): Promise<PrismaTelemetrySnapshot | null>;
  findRange(query: TelemetryRangeQuery): Promise<{ items: PrismaTelemetrySnapshot[]; total: number }>;
  exists(id: string): Promise<boolean>;
  deleteOlderThan(cutoffDate: Date): Promise<number>;
  aggregate(deviceId: string, from?: Date, to?: Date): Promise<TelemetryAggregationResult>;
}

export const ITelemetryRepositoryToken = Symbol('ITelemetryRepository');
