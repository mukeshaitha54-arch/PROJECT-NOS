import { Injectable } from "@nestjs/common";
import { Heartbeat } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import {
  IHeartbeatRepository,
  CreateHeartbeatInput,
} from "../../common/repositories/heartbeat.repository.interface";

@Injectable()
export class PrismaHeartbeatRepository implements IHeartbeatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateHeartbeatInput): Promise<Heartbeat> {
    return this.prisma.heartbeat.create({
      data: {
        deviceId: data.deviceId,
        cpuUsage: data.cpuUsage,
        ramUsage: data.ramUsage,
        uptime: data.uptime,
        ipAddress: data.ipAddress,
        timestamp: data.timestamp || new Date(),
      },
    });
  }

  async findLatestByDeviceId(deviceId: string): Promise<Heartbeat | null> {
    return this.prisma.heartbeat.findFirst({
      where: { deviceId },
      orderBy: { timestamp: "desc" },
    });
  }

  async findRecentByDeviceId(
    deviceId: string,
    limit = 10,
  ): Promise<Heartbeat[]> {
    return this.prisma.heartbeat.findMany({
      where: { deviceId },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  }

  async deleteOldHeartbeats(olderThan: Date): Promise<number> {
    const res = await this.prisma.heartbeat.deleteMany({
      where: {
        timestamp: { lt: olderThan },
      },
    });
    return res.count;
  }
}
