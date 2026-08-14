import { Injectable, Logger } from "@nestjs/common";
import { SocketPresenceDto } from "@nos/shared-types";

interface UserPresenceRecord {
  socketId: string;
  userId: string;
  role: string;
  ipAddress: string;
  onlineSince: Date;
  lastActivity: Date;
}

interface DevicePresenceRecord {
  deviceId: string;
  ipAddress: string;
  onlineSince: Date;
  lastActivity: Date;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private readonly onlineUsers = new Map<string, UserPresenceRecord>(); // userId -> presence
  private readonly onlineDevices = new Map<string, DevicePresenceRecord>(); // deviceId -> presence

  public updateUserActivity(
    userId: string,
    socketId: string,
    role = "USER",
    ipAddress = "0.0.0.0",
  ): void {
    const now = new Date();
    const existing = this.onlineUsers.get(userId);
    if (existing) {
      existing.lastActivity = now;
      existing.socketId = socketId;
    } else {
      this.onlineUsers.set(userId, {
        socketId,
        userId,
        role,
        ipAddress,
        onlineSince: now,
        lastActivity: now,
      });
      this.logger.debug(`User [${userId}] is now ONLINE in PresenceService.`);
    }
  }

  public removeUser(userId: string): void {
    if (this.onlineUsers.has(userId)) {
      this.onlineUsers.delete(userId);
      this.logger.debug(`User [${userId}] is now OFFLINE in PresenceService.`);
    }
  }

  public updateDeviceOnline(
    deviceId: string,
    ipAddress = "0.0.0.0",
    timestamp?: Date,
  ): void {
    const now = timestamp || new Date();
    const existing = this.onlineDevices.get(deviceId);
    if (existing) {
      existing.lastActivity = now;
      if (ipAddress && ipAddress !== "0.0.0.0") existing.ipAddress = ipAddress;
    } else {
      this.onlineDevices.set(deviceId, {
        deviceId,
        ipAddress,
        onlineSince: now,
        lastActivity: now,
      });
      this.logger.debug(`Device [${deviceId}] registered online presence.`);
    }
  }

  public updateDeviceOffline(deviceId: string): void {
    if (this.onlineDevices.has(deviceId)) {
      this.onlineDevices.delete(deviceId);
      this.logger.debug(`Device [${deviceId}] removed from online presence.`);
    }
  }

  public isDeviceOnline(deviceId: string): boolean {
    return this.onlineDevices.has(deviceId);
  }

  public isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  public getOnlineUsersList(): SocketPresenceDto[] {
    return Array.from(this.onlineUsers.values()).map((rec) => ({
      socketId: rec.socketId,
      userId: rec.userId,
      role: rec.role,
      ipAddress: rec.ipAddress,
      onlineSince: rec.onlineSince.toISOString(),
      lastActivity: rec.lastActivity.toISOString(),
    }));
  }

  public getOnlineDevicesList(): SocketPresenceDto[] {
    return Array.from(this.onlineDevices.values()).map((rec) => ({
      socketId: `agent-${rec.deviceId}`,
      deviceId: rec.deviceId,
      ipAddress: rec.ipAddress,
      onlineSince: rec.onlineSince.toISOString(),
      lastActivity: rec.lastActivity.toISOString(),
    }));
  }

  public getOnlineDevicesCount(): number {
    return this.onlineDevices.size;
  }
}
