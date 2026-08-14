import { Injectable, Logger } from "@nestjs/common";

export interface SocketSessionMetadata {
  socketId: string;
  userId?: string;
  deviceId?: string;
  role?: string;
  ipAddress?: string;
  connectedAt: number;
  rooms: Set<string>;
}

@Injectable()
export class ConnectionRegistryService {
  private readonly logger = new Logger(ConnectionRegistryService.name);
  private readonly sessions = new Map<string, SocketSessionMetadata>();
  private readonly userToSockets = new Map<string, Set<string>>();
  private readonly deviceToSockets = new Map<string, Set<string>>();

  public registerSession(
    metadata: Omit<SocketSessionMetadata, "rooms" | "connectedAt">,
  ): SocketSessionMetadata {
    const session: SocketSessionMetadata = {
      ...metadata,
      connectedAt: Date.now(),
      rooms: new Set<string>(),
    };

    this.sessions.set(session.socketId, session);

    if (session.userId) {
      if (!this.userToSockets.has(session.userId)) {
        this.userToSockets.set(session.userId, new Set<string>());
      }
      this.userToSockets.get(session.userId)!.add(session.socketId);
    }

    if (session.deviceId) {
      if (!this.deviceToSockets.has(session.deviceId)) {
        this.deviceToSockets.set(session.deviceId, new Set<string>());
      }
      this.deviceToSockets.get(session.deviceId)!.add(session.socketId);
    }

    this.logger.debug(
      `Registered session [${session.socketId}] User: [${session.userId || "N/A"}] Role: [${session.role || "N/A"}]`,
    );
    return session;
  }

  public removeSession(socketId: string): SocketSessionMetadata | undefined {
    const session = this.sessions.get(socketId);
    if (!session) return undefined;

    // Memory Leak Prevention (SPL Feature 15): Cleanly remove from all lookup maps and sets
    this.sessions.delete(socketId);

    if (session.userId) {
      const userSockets = this.userToSockets.get(session.userId);
      if (userSockets) {
        userSockets.delete(socketId);
        if (userSockets.size === 0) {
          this.userToSockets.delete(session.userId);
        }
      }
    }

    if (session.deviceId) {
      const deviceSockets = this.deviceToSockets.get(session.deviceId);
      if (deviceSockets) {
        deviceSockets.delete(socketId);
        if (deviceSockets.size === 0) {
          this.deviceToSockets.delete(session.deviceId);
        }
      }
    }

    session.rooms.clear();
    this.logger.debug(`Removed session [${socketId}]`);
    return session;
  }

  public getSession(socketId: string): SocketSessionMetadata | undefined {
    return this.sessions.get(socketId);
  }

  public addRoom(socketId: string, room: string): void {
    const session = this.sessions.get(socketId);
    if (session) {
      session.rooms.add(room);
    }
  }

  public removeRoom(socketId: string, room: string): void {
    const session = this.sessions.get(socketId);
    if (session) {
      session.rooms.delete(room);
    }
  }

  public getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  public getAllSessions(): SocketSessionMetadata[] {
    return Array.from(this.sessions.values());
  }

  public getTotalActiveRooms(): number {
    const uniqueRooms = new Set<string>();
    for (const session of this.sessions.values()) {
      for (const r of session.rooms) {
        uniqueRooms.add(r);
      }
    }
    return uniqueRooms.size;
  }
}
