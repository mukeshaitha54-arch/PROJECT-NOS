import { Device, DeviceStatus } from '@prisma/client';

export const IDeviceRepositoryToken = Symbol('IDeviceRepository');

export interface CreateDeviceInput {
  uuid: string;
  hostname: string;
  deviceName: string;
  os: string;
  osVersion: string;
  architecture: string;
  agentVersion: string;
  status?: DeviceStatus;
  organizationId?: string;
  tokenHash?: string;
  lastSeen?: Date;
}

export interface UpdateDeviceInput {
  hostname?: string;
  deviceName?: string;
  os?: string;
  osVersion?: string;
  architecture?: string;
  agentVersion?: string;
  status?: DeviceStatus;
  lastSeen?: Date;
  tokenHash?: string;
}

export interface IDeviceRepository {
  findById(id: string): Promise<Device | null>;
  findByUuid(uuid: string): Promise<Device | null>;
  findByTokenHash(tokenHash: string): Promise<Device | null>;
  findAll(): Promise<Device[]>;
  create(data: CreateDeviceInput): Promise<Device>;
  update(id: string, data: UpdateDeviceInput): Promise<Device>;
  delete(id: string): Promise<boolean>;
  countByStatus(): Promise<Record<DeviceStatus, number>>;
}
