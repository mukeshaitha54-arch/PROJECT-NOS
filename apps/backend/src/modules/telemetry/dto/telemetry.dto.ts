import { IsNumber, IsString, IsOptional, Min, Max, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TelemetrySnapshot as PrismaTelemetrySnapshot } from '@prisma/client';
import { TelemetrySnapshot as TelemetrySnapshotContract } from '@nos/shared-types';

export class SubmitTelemetryDto {
  @ApiPropertyOptional({ description: 'Explicit device UUID if differing from authorization token state' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ description: 'CPU processing load percentage (0 - 100%)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  cpuUsage!: number;

  @ApiProperty({ description: 'CPU temperature in degrees Celsius' })
  @IsNumber()
  cpuTemperature!: number;

  @ApiProperty({ description: 'CPU core clock frequency in MHz / GHz' })
  @IsNumber()
  @Min(0)
  cpuFrequency!: number;

  @ApiProperty({ description: 'Total logical processing core threads' })
  @IsInt()
  @Min(1)
  logicalProcessors!: number;

  @ApiProperty({ description: 'Total physical CPU core units' })
  @IsInt()
  @Min(1)
  physicalProcessors!: number;

  @ApiProperty({ description: 'Active memory consumption in bytes or MB' })
  @IsNumber()
  @Min(0)
  memoryUsed!: number;

  @ApiProperty({ description: 'Available free memory in bytes or MB' })
  @IsNumber()
  @Min(0)
  memoryFree!: number;

  @ApiProperty({ description: 'Total memory capacity in bytes or MB' })
  @IsNumber()
  @Min(0)
  memoryTotal!: number;

  @ApiProperty({ description: 'Memory usage percentage gauge (0 - 100%)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  memoryUsagePercent!: number;

  @ApiProperty({ description: 'Storage drive read throughput speed in bytes/sec' })
  @IsNumber()
  @Min(0)
  diskReadSpeed!: number;

  @ApiProperty({ description: 'Storage drive write throughput speed in bytes/sec' })
  @IsNumber()
  @Min(0)
  diskWriteSpeed!: number;

  @ApiProperty({ description: 'Primary disk usage percentage gauge (0 - 100%)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  diskUsagePercent!: number;

  @ApiProperty({ description: 'Available primary storage capacity in bytes or MB/GB' })
  @IsNumber()
  @Min(0)
  diskFree!: number;

  @ApiProperty({ description: 'Total primary storage capacity in bytes or MB/GB' })
  @IsNumber()
  @Min(0)
  diskTotal!: number;

  @ApiProperty({ description: 'Network interface transmission rate in bytes/sec', minimum: 0 })
  @IsNumber()
  @Min(0)
  networkUploadSpeed!: number;

  @ApiProperty({ description: 'Network interface reception rate in bytes/sec', minimum: 0 })
  @IsNumber()
  @Min(0)
  networkDownloadSpeed!: number;

  @ApiProperty({ description: 'Cumulative bytes transmitted since boot' })
  @IsNumber()
  @Min(0)
  bytesSent!: number;

  @ApiProperty({ description: 'Cumulative bytes received since boot' })
  @IsNumber()
  @Min(0)
  bytesReceived!: number;

  @ApiProperty({ description: 'Count of active network TCP sockets and connections' })
  @IsInt()
  @Min(0)
  activeConnections!: number;

  @ApiProperty({ description: 'Total running operational kernel processes' })
  @IsInt()
  @Min(0)
  runningProcesses!: number;

  @ApiProperty({ description: 'Host OS continuous uptime in elapsed seconds' })
  @IsNumber()
  @Min(0)
  systemUptime!: number;

  @ApiProperty({ description: 'Host OS initial boot timestamp (ISO 8601 UTC string)' })
  @IsString()
  bootTime!: string;

  @ApiProperty({ description: 'Primary network interface IPv4 routing address' })
  @IsString()
  ipAddress!: string;

  @ApiProperty({ description: 'Primary network adapter physical hardware MAC address' })
  @IsString()
  macAddress!: string;

  @ApiPropertyOptional({ description: 'Client snapshot timestamp in ISO 8601 UTC format' })
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class TelemetryHistoryQueryDto {
  @ApiPropertyOptional({ description: 'ISO 8601 UTC start filter timestamp' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 UTC end filter timestamp' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: 'Number of records per page (default 50)', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: '1-indexed pagination page number (default 1)', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

/**
 * Transforms raw Prisma ORM telemetry database entities into strict domain DTO response contracts.
 * Ensures zero direct exposure of Prisma internals and enforces UTC ISO formatting.
 */
export function toTelemetrySnapshotDto(entity: PrismaTelemetrySnapshot): TelemetrySnapshotContract {
  return {
    id: entity.id,
    deviceId: entity.deviceId,
    cpuUsage: entity.cpuUsage,
    cpuTemperature: entity.cpuTemperature,
    cpuFrequency: entity.cpuFrequency,
    logicalProcessors: entity.logicalProcessors,
    physicalProcessors: entity.physicalProcessors,
    memoryUsed: entity.memoryUsed,
    memoryFree: entity.memoryFree,
    memoryTotal: entity.memoryTotal,
    memoryUsagePercent: entity.memoryUsagePercent,
    diskReadSpeed: entity.diskReadSpeed,
    diskWriteSpeed: entity.diskWriteSpeed,
    diskUsagePercent: entity.diskUsagePercent,
    diskFree: entity.diskFree,
    diskTotal: entity.diskTotal,
    networkUploadSpeed: entity.networkUploadSpeed,
    networkDownloadSpeed: entity.networkDownloadSpeed,
    bytesSent: entity.bytesSent,
    bytesReceived: entity.bytesReceived,
    activeConnections: entity.activeConnections,
    runningProcesses: entity.runningProcesses,
    systemUptime: entity.systemUptime,
    bootTime: entity.bootTime.toISOString(),
    ipAddress: entity.ipAddress,
    macAddress: entity.macAddress,
    timestamp: entity.timestamp.toISOString(),
  };
}
