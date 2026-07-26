import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
} from '@nos/shared-types';

export class MemoryModulePayloadDto implements MemoryModuleDto {
  @ApiProperty({ example: 'DIMM 1' })
  @IsString()
  @IsNotEmpty()
  slot!: string;

  @ApiProperty({ example: 17179869184 })
  @IsNumber()
  capacityBytes!: number;

  @ApiProperty({ example: 3200 })
  @IsInt()
  @Min(0)
  speedMHz!: number;

  @ApiProperty({ example: 'Samsung' })
  @IsString()
  manufacturer!: string;

  @ApiProperty({ example: 'M378A2K43D10-KH2' })
  @IsString()
  partNumber!: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  serialNumber!: string;
}

export class DiskDrivePayloadDto implements DiskDriveDto {
  @ApiProperty({ example: 'C:\\' })
  @IsString()
  @IsNotEmpty()
  driveName!: string;

  @ApiProperty({ example: 'Samsung SSD 980 PRO 1TB' })
  @IsString()
  model!: string;

  @ApiProperty({ example: 'S5GXNF0R123456' })
  @IsString()
  @IsNotEmpty()
  serialNumber!: string;

  @ApiProperty({ example: 'NVMe' })
  @IsString()
  mediaType!: string;

  @ApiProperty({ example: 1000204886016 })
  @IsNumber()
  sizeBytes!: number;

  @ApiProperty({ example: 'NTFS' })
  @IsString()
  fileSystem!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isSystemDrive!: boolean;
}

export class GpuPayloadDto implements GpuDto {
  @ApiProperty({ example: 'NVIDIA GeForce RTX 4080' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'NVIDIA' })
  @IsString()
  manufacturer!: string;

  @ApiProperty({ example: '537.58' })
  @IsString()
  driverVersion!: string;

  @ApiProperty({ example: 17179869184 })
  @IsNumber()
  vRamBytes!: number;

  @ApiProperty({ example: '3840x2160' })
  @IsString()
  resolution!: string;
}

export class NetworkAdapterPayloadDto implements NetworkAdapterDto {
  @ApiProperty({ example: 'Intel(R) Ethernet Controller I225-V' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Gigabit Network Connection' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '00:1B:2C:3D:4E:5F' })
  @IsString()
  @IsNotEmpty()
  macAddress!: string;

  @ApiProperty({ example: '192.168.1.100' })
  @IsString()
  ipv4!: string;

  @ApiProperty({ example: 'fe80::21b:2cff:fe3d:4e5f' })
  @IsString()
  ipv6!: string;

  @ApiProperty({ example: '192.168.1.1' })
  @IsString()
  gateway!: string;

  @ApiProperty({ example: '8.8.8.8, 1.1.1.1' })
  @IsString()
  dns!: string;

  @ApiProperty({ example: 2500 })
  @IsNumber()
  speedMbps!: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  isWireless!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  isPhysical!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  isOperational!: boolean;
}

export class InstalledSoftwarePayloadDto implements InstalledSoftwareDto {
  @ApiProperty({ example: 'Google Chrome' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Google LLC' })
  @IsString()
  publisher!: string;

  @ApiProperty({ example: '120.0.6099.225' })
  @IsString()
  version!: string;

  @ApiProperty({ example: '2025-01-15' })
  @IsString()
  installDate!: string;

  @ApiPropertyOptional({ example: 'C:\\Program Files\\Google\\Chrome' })
  @IsOptional()
  @IsString()
  installLocation?: string;
}

export class WindowsServicePayloadDto implements WindowsServiceDto {
  @ApiProperty({ example: 'Winmgmt' })
  @IsString()
  @IsNotEmpty()
  serviceName!: string;

  @ApiProperty({ example: 'Windows Management Instrumentation' })
  @IsString()
  displayName!: string;

  @ApiProperty({ example: 'Running' })
  @IsString()
  status!: string;

  @ApiProperty({ example: 'Automatic' })
  @IsString()
  startType!: string;

  @ApiProperty({ example: 'LocalSystem' })
  @IsString()
  account!: string;
}

export class StartupApplicationPayloadDto implements StartupApplicationDto {
  @ApiProperty({ example: 'OneDrive' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe /background' })
  @IsString()
  command!: string;

  @ApiProperty({ example: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' })
  @IsString()
  location!: string;

  @ApiProperty({ example: 'Current User' })
  @IsString()
  user!: string;
}

export class SecurityInventoryPayloadDto implements SecurityInventoryDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  windowsDefenderEnabled!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  firewallEnabled!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  bitLockerEnabled!: boolean;

  @ApiPropertyOptional({ example: 'C:' })
  @IsOptional()
  @IsString()
  bitLockerDrive?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  secureBootEnabled!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  tpmEnabled!: boolean;

  @ApiPropertyOptional({ example: '2.0' })
  @IsOptional()
  @IsString()
  tpmVersion?: string;
}

export class DeviceCapabilitiesPayloadDto implements DeviceCapabilitiesDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  supportsGPU!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  supportsBattery!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  supportsTPM!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  supportsVirtualization!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  supportsDocker!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  supportsWSL!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  supportsWiFi!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  supportsEthernet!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  virtualMachineDetection!: boolean;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsString()
  vmVendor?: string;
}

export class SubmitInventoryRequestDto implements SubmitInventoryPayload {
  @ApiPropertyOptional({ example: 'uuid' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ example: 'Dell Inc.' })
  @IsString()
  @IsNotEmpty()
  manufacturer!: string;

  @ApiProperty({ example: 'PowerEdge R750' })
  @IsString()
  @IsNotEmpty()
  model!: string;

  @ApiProperty({ example: 'CN-12345' })
  @IsString()
  @IsNotEmpty()
  serialNumber!: string;

  @ApiProperty({ example: '0X1Y2Z' })
  @IsString()
  @IsNotEmpty()
  motherboard!: string;

  @ApiProperty({ example: 'American Megatrends Inc.' })
  @IsString()
  biosVendor!: string;

  @ApiProperty({ example: '2.14.0' })
  @IsString()
  biosVersion!: string;

  @ApiPropertyOptional({ example: '2024-05-10' })
  @IsOptional()
  @IsString()
  biosReleaseDate?: string;

  @ApiProperty({ example: 'Intel Xeon Platinum 8368' })
  @IsString()
  @IsNotEmpty()
  cpuModel!: string;

  @ApiProperty({ example: 'GenuineIntel' })
  @IsString()
  cpuVendor!: string;

  @ApiProperty({ example: 38 })
  @IsInt()
  @Min(1)
  physicalCores!: number;

  @ApiProperty({ example: 76 })
  @IsInt()
  @Min(1)
  logicalCores!: number;

  @ApiProperty({ example: 'EDGE-NODE-01' })
  @IsString()
  @IsNotEmpty()
  hostname!: string;

  @ApiPropertyOptional({ example: 'CORP.LOCAL' })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({ example: 'WORKGROUP' })
  @IsOptional()
  @IsString()
  workgroup?: string;

  @ApiProperty({ example: 'Windows Server 2022 Datacenter' })
  @IsString()
  osEdition!: string;

  @ApiProperty({ example: '20348.2227' })
  @IsString()
  osBuild!: string;

  @ApiProperty({ example: 'x64' })
  @IsString()
  architecture!: string;

  @ApiPropertyOptional({ example: '2.0.0-phase3' })
  @IsOptional()
  @IsString()
  agentVersion?: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  schemaVersion?: string;

  @ApiProperty({ type: [MemoryModulePayloadDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MemoryModulePayloadDto)
  memoryModules!: MemoryModulePayloadDto[];

  @ApiProperty({ type: [DiskDrivePayloadDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiskDrivePayloadDto)
  diskDrives!: DiskDrivePayloadDto[];

  @ApiProperty({ type: [GpuPayloadDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GpuPayloadDto)
  gpus!: GpuPayloadDto[];

  @ApiProperty({ type: [NetworkAdapterPayloadDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NetworkAdapterPayloadDto)
  networkAdapters!: NetworkAdapterPayloadDto[];

  @ApiProperty({ type: [InstalledSoftwarePayloadDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstalledSoftwarePayloadDto)
  installedSoftware!: InstalledSoftwarePayloadDto[];

  @ApiProperty({ type: [WindowsServicePayloadDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WindowsServicePayloadDto)
  windowsServices!: WindowsServicePayloadDto[];

  @ApiProperty({ type: [StartupApplicationPayloadDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StartupApplicationPayloadDto)
  startupApplications!: StartupApplicationPayloadDto[];

  @ApiProperty({ type: SecurityInventoryPayloadDto })
  @ValidateNested()
  @Type(() => SecurityInventoryPayloadDto)
  security!: SecurityInventoryPayloadDto;

  @ApiProperty({ type: DeviceCapabilitiesPayloadDto })
  @ValidateNested()
  @Type(() => DeviceCapabilitiesPayloadDto)
  capabilities!: DeviceCapabilitiesPayloadDto;
}

export class InventoryQueryDto {
  @ApiPropertyOptional({ example: 'Chrome' })
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
