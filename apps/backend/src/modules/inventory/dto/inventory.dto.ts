import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  IsInt,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  SubmitInventoryPayload,
  MemoryModuleDto,
  DiskDriveDto,
  GpuDto,
  NetworkAdapterDto,
  InstalledSoftwareDto,
  WindowsServiceDto,
  StartupApplicationDto,
  SecurityInventoryDto,
  DeviceCapabilitiesDto,
} from "@nos/shared-types";

export class MemoryModulePayloadDto implements MemoryModuleDto {
  @ApiPropertyOptional({ example: "DIMM 1" })
  @IsOptional()
  @IsString()
  slot?: string;

  @ApiPropertyOptional({ example: 17179869184 })
  @IsOptional()
  @IsNumber()
  capacityBytes?: number;

  @ApiPropertyOptional({ example: 3200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  speedMHz?: number;

  @ApiPropertyOptional({ example: "Samsung" })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ example: "M378A2K43D10-KH2" })
  @IsOptional()
  @IsString()
  partNumber?: string;

  @ApiPropertyOptional({ example: "12345678" })
  @IsOptional()
  @IsString()
  serialNumber?: string;
}

export class DiskDrivePayloadDto implements DiskDriveDto {
  @ApiPropertyOptional({ example: "C:\\" })
  @IsOptional()
  @IsString()
  driveName?: string;

  @ApiPropertyOptional({ example: "Samsung SSD 980 PRO 1TB" })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: "S5GXNF0R123456" })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ example: "NVMe" })
  @IsOptional()
  @IsString()
  mediaType?: string;

  @ApiPropertyOptional({ example: 1000204886016 })
  @IsOptional()
  @IsNumber()
  sizeBytes?: number;

  @ApiPropertyOptional({ example: "NTFS" })
  @IsOptional()
  @IsString()
  fileSystem?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isSystemDrive?: boolean;
}

export class GpuPayloadDto implements GpuDto {
  @ApiPropertyOptional({ example: "NVIDIA GeForce RTX 4080" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "NVIDIA" })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ example: "537.58" })
  @IsOptional()
  @IsString()
  driverVersion?: string;

  @ApiPropertyOptional({ example: 17179869184 })
  @IsOptional()
  @IsNumber()
  vRamBytes?: number;

  @ApiPropertyOptional({ example: "3840x2160" })
  @IsOptional()
  @IsString()
  resolution?: string;
}

export class NetworkAdapterPayloadDto implements NetworkAdapterDto {
  @ApiPropertyOptional({ example: "Intel(R) Ethernet Controller I225-V" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "Gigabit Network Connection" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: "00:1B:2C:3D:4E:5F" })
  @IsOptional()
  @IsString()
  macAddress?: string;

  @ApiPropertyOptional({ example: "192.168.1.100" })
  @IsOptional()
  @IsString()
  ipv4?: string;

  @ApiPropertyOptional({ example: "fe80::21b:2cff:fe3d:4e5f" })
  @IsOptional()
  @IsString()
  ipv6?: string;

  @ApiPropertyOptional({ example: "192.168.1.1" })
  @IsOptional()
  @IsString()
  gateway?: string;

  @ApiPropertyOptional({ example: "8.8.8.8, 1.1.1.1" })
  @IsOptional()
  @IsString()
  dns?: string;

  @ApiPropertyOptional({ example: 2500 })
  @IsOptional()
  @IsNumber()
  speedMbps?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isWireless?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPhysical?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isOperational?: boolean;
}

export class InstalledSoftwarePayloadDto implements InstalledSoftwareDto {
  @ApiProperty({ example: "Google Chrome" })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: "Google LLC" })
  @IsOptional()
  @IsString()
  publisher?: string;

  @ApiPropertyOptional({ example: "120.0.6099.225" })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ example: "2025-01-15" })
  @IsOptional()
  @IsString()
  installDate?: string;

  @ApiPropertyOptional({ example: "C:\\Program Files\\Google\\Chrome" })
  @IsOptional()
  @IsString()
  installLocation?: string;
}

export class WindowsServicePayloadDto implements WindowsServiceDto {
  @ApiProperty({ example: "Winmgmt" })
  @IsString()
  serviceName!: string;

  @ApiPropertyOptional({ example: "Windows Management Instrumentation" })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: "Running" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: "Automatic" })
  @IsOptional()
  @IsString()
  startType?: string;

  @ApiPropertyOptional({ example: "LocalSystem" })
  @IsOptional()
  @IsString()
  account?: string;
}

export class StartupApplicationPayloadDto implements StartupApplicationDto {
  @ApiProperty({ example: "OneDrive" })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    example: "C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe /background",
  })
  @IsOptional()
  @IsString()
  command?: string;

  @ApiPropertyOptional({
    example: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: "Current User" })
  @IsOptional()
  @IsString()
  user?: string;
}

export class SecurityInventoryPayloadDto implements SecurityInventoryDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  windowsDefenderEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  firewallEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  bitLockerEnabled?: boolean;

  @ApiPropertyOptional({ example: "C:" })
  @IsOptional()
  @IsString()
  bitLockerDrive?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  secureBootEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  tpmEnabled?: boolean;

  @ApiPropertyOptional({ example: "2.0" })
  @IsOptional()
  @IsString()
  tpmVersion?: string;
}

export class DeviceCapabilitiesPayloadDto implements DeviceCapabilitiesDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  supportsGPU?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  supportsBattery?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  supportsTPM?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  supportsVirtualization?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  supportsDocker?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  supportsWSL?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  supportsWiFi?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  supportsEthernet?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  virtualMachineDetection?: boolean;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsString()
  vmVendor?: string;
}

export class SubmitInventoryRequestDto implements SubmitInventoryPayload {
  @ApiPropertyOptional({ example: "uuid" })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ example: "Dell Inc." })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ example: "PowerEdge R750" })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: "CN-12345" })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ example: "0X1Y2Z" })
  @IsOptional()
  @IsString()
  motherboard?: string;

  @ApiPropertyOptional({ example: "American Megatrends Inc." })
  @IsOptional()
  @IsString()
  biosVendor?: string;

  @ApiPropertyOptional({ example: "2.14.0" })
  @IsOptional()
  @IsString()
  biosVersion?: string;

  @ApiPropertyOptional({ example: "2024-05-10" })
  @IsOptional()
  @IsString()
  biosReleaseDate?: string;

  @ApiPropertyOptional({ example: "Intel Xeon Platinum 8368" })
  @IsOptional()
  @IsString()
  cpuModel?: string;

  @ApiPropertyOptional({ example: "GenuineIntel" })
  @IsOptional()
  @IsString()
  cpuVendor?: string;

  @ApiPropertyOptional({ example: 38 })
  @IsOptional()
  @IsInt()
  @Min(1)
  physicalCores?: number;

  @ApiPropertyOptional({ example: 76 })
  @IsOptional()
  @IsInt()
  @Min(1)
  logicalCores?: number;

  @ApiPropertyOptional({ example: "EDGE-NODE-01" })
  @IsOptional()
  @IsString()
  hostname?: string;

  @ApiPropertyOptional({ example: "CORP.LOCAL" })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({ example: "WORKGROUP" })
  @IsOptional()
  @IsString()
  workgroup?: string;

  @ApiPropertyOptional({ example: "Windows Server 2022 Datacenter" })
  @IsOptional()
  @IsString()
  osEdition?: string;

  @ApiPropertyOptional({ example: "20348.2227" })
  @IsOptional()
  @IsString()
  osBuild?: string;

  @ApiPropertyOptional({ example: "x64" })
  @IsOptional()
  @IsString()
  architecture?: string;

  @ApiPropertyOptional({ example: "2.0.0-phase3" })
  @IsOptional()
  @IsString()
  agentVersion?: string;

  @ApiPropertyOptional({ example: "1.0.0" })
  @IsOptional()
  @IsString()
  schemaVersion?: string;

  @ApiPropertyOptional({ type: [MemoryModulePayloadDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MemoryModulePayloadDto)
  memoryModules?: MemoryModulePayloadDto[];

  @ApiPropertyOptional({ type: [DiskDrivePayloadDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiskDrivePayloadDto)
  diskDrives?: DiskDrivePayloadDto[];

  @ApiPropertyOptional({ type: [GpuPayloadDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GpuPayloadDto)
  gpus?: GpuPayloadDto[];

  @ApiPropertyOptional({ type: [NetworkAdapterPayloadDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NetworkAdapterPayloadDto)
  networkAdapters?: NetworkAdapterPayloadDto[];

  @ApiPropertyOptional({ type: [InstalledSoftwarePayloadDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstalledSoftwarePayloadDto)
  installedSoftware?: InstalledSoftwarePayloadDto[];

  @ApiPropertyOptional({ type: [WindowsServicePayloadDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WindowsServicePayloadDto)
  windowsServices?: WindowsServicePayloadDto[];

  @ApiPropertyOptional({ type: [StartupApplicationPayloadDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StartupApplicationPayloadDto)
  startupApplications?: StartupApplicationPayloadDto[];

  @ApiPropertyOptional({ type: SecurityInventoryPayloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SecurityInventoryPayloadDto)
  security?: SecurityInventoryPayloadDto;

  @ApiPropertyOptional({ type: DeviceCapabilitiesPayloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceCapabilitiesPayloadDto)
  capabilities?: DeviceCapabilitiesPayloadDto;
}

export class InventoryQueryDto {
  @ApiPropertyOptional({ example: "Chrome" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 50;
}
