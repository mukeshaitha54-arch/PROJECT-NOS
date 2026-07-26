import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { DeviceStatus, RegisterDevicePayload, HeartbeatPayload } from '@nos/shared-types';

export class RegisterDeviceDto implements RegisterDevicePayload {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', description: 'Unique Hardware GUID or machine UUID' })
  @IsString()
  @IsNotEmpty()
  uuid: string;

  @ApiProperty({ example: 'WIN-SRV-CORE-01', description: 'Machine hostname or FQDN' })
  @IsString()
  @IsNotEmpty()
  hostname: string;

  @ApiProperty({ example: 'Primary Enterprise Domain Server', description: 'Friendly monitoring device title' })
  @IsString()
  @IsNotEmpty()
  deviceName: string;

  @ApiProperty({ example: 'Windows Server 2022 Datacenter', description: 'Operating system flavor' })
  @IsString()
  @IsNotEmpty()
  os: string;

  @ApiProperty({ example: '10.0.20348', description: 'Operating system version or kernel build' })
  @IsString()
  @IsNotEmpty()
  osVersion: string;

  @ApiProperty({ example: 'X64', description: 'Processor architecture (X64, Arm64)' })
  @IsString()
  @IsNotEmpty()
  architecture: string;

  @ApiProperty({ example: '2.0.0-phase2a', description: 'NOS Monitoring Agent release version' })
  @IsString()
  @IsNotEmpty()
  agentVersion: string;

  @ApiPropertyOptional({ example: 'org-enterprise-corp-01', description: 'Optional organizational tenant boundary' })
  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class HeartbeatDto implements HeartbeatPayload {
  @ApiPropertyOptional({ example: 'device-id-uuid-string', description: 'Optional explicit device ID (otherwise derived from secure auth token)' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ example: 14.5, description: 'Current CPU load percentage (0.0 to 100.0)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  cpuUsage: number;

  @ApiProperty({ example: 62.8, description: 'Current Memory utilization percentage (0.0 to 100.0)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  ramUsage: number;

  @ApiProperty({ example: 86400.5, description: 'Total system operational continuous uptime in seconds' })
  @IsNumber()
  @Min(0)
  uptime: number;

  @ApiProperty({ example: '192.168.10.45', description: 'Agent originating IPv4 or IPv6 network address' })
  @IsString()
  @IsNotEmpty()
  ipAddress: string;

  @ApiProperty({ example: '2026-07-25T17:00:00.000Z', description: 'Heartbeat sample timestamp in ISO 8601 format' })
  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @ApiPropertyOptional({ example: 'WIN-SRV-CORE-01', description: 'Optional diagnostic hostname mirror' })
  @IsOptional()
  @IsString()
  hostname?: string;

  @ApiPropertyOptional({ example: 'Windows Server 2022', description: 'Optional diagnostic OS mirror' })
  @IsOptional()
  @IsString()
  os?: string;
}
