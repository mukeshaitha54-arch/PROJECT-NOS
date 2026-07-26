import { Heartbeat } from '@prisma/client';

export const IHeartbeatRepositoryToken = Symbol('IHeartbeatRepository');

export interface CreateHeartbeatInput {
  deviceId: string;
  cpuUsage: number;
  ramUsage: number;
  uptime: number;
  ipAddress: string;
  timestamp?: Date;
}

export interface IHeartbeatRepository {
  create(data: CreateHeartbeatInput): Promise<Heartbeat>;
  findLatestByDeviceId(deviceId: string): Promise<Heartbeat | null>;
  findRecentByDeviceId(deviceId: string, limit?: number): Promise<Heartbeat[]>;
  deleteOldHeartbeats(olderThan: Date): Promise<number>;
}
