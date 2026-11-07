import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import {
  Inject,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Server, Socket } from "socket.io";
import {
  UserRole,
  SocketRooms,
  SocketEvents,
  getDeviceRoom,
  SocketEventEnvelope,
} from "@nos/shared-types";
import {
  IUserRepository,
  IUserRepositoryToken,
} from "../../common/repositories/user.repository.interface";
import { ConnectionRegistryService } from "./services/connection-registry.service";
import { PresenceService } from "./services/presence.service";
import { SocketMetricsService } from "./services/socket-metrics.service";
import { SocketRateLimiterService } from "./services/socket-rate-limiter.service";
import { PrismaService } from "../../database/prisma.service";
import {
  ISocketPublisherToken,
  ISocketPublisher,
} from "../../common/services/socket-publisher.interface";
import { SocketPublisherService } from "./services/socket-publisher.service";

@WebSocketGateway({
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || "*",
    credentials: true,
  },
  namespace: process.env.SOCKET_NAMESPACE || "/realtime",
  pingTimeout: Number(process.env.SOCKET_PING_TIMEOUT) || 20000,
  pingInterval: Number(process.env.SOCKET_PING_INTERVAL) || 25000,
  transports: ["websocket", "polling"],
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  public server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @Inject(IUserRepositoryToken) private readonly userRepo: IUserRepository,
    private readonly registry: ConnectionRegistryService,
    private readonly presence: PresenceService,
    private readonly metrics: SocketMetricsService,
    private readonly rateLimiter: SocketRateLimiterService,
    @Inject(forwardRef(() => ISocketPublisherToken))
    private readonly publisher: SocketPublisherService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log(
      `Enterprise Realtime Gateway initialized on namespace [${process.env.SOCKET_NAMESPACE || "/realtime"}] (Proxy Ready, CORS: ${this.configService.get("SOCKET_CORS_ORIGIN", "*")})`,
    );
    // Bind the server instance to the publisher service
    this.publisher.setServer(server);
  }

  async handleConnection(client: Socket) {
    const startMs = Date.now();
    try {
      // Proxy Ready (SPL Feature 13): Parse real IP from X-Forwarded-For or socket address
      const forwardedFor = client.handshake.headers["x-forwarded-for"];
      const ipAddress =
        (Array.isArray(forwardedFor)
          ? forwardedFor[0]
          : forwardedFor || client.handshake.address) || "0.0.0.0";

      // Rate Limiting (SPL Feature 12): Prevent Reconnect & Connect Spam
      if (!this.rateLimiter.checkLimit(ipAddress, "reconnect", 20, 60)) {
        this.logger.warn(
          `Connection rejected for [${ipAddress}]: Reconnect spam limit reached.`,
        );
        client.disconnect(true);
        return;
      }

      // Zero Trust Authentication (SPL Feature 2): Validate Bearer token or handshake auth
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(
          `Unauthorized socket connection attempt from [${ipAddress}]: Missing token.`,
        );
        this.metrics.recordAuthFailure();
        client.emit("unauthorized", {
          error: "Authentication token missing or invalid in socket handshake.",
        });
        client.disconnect(true);
        return;
      }

      // Verify cryptographic token & identify user/agent
      const secret = this.configService.get<string>(
        "JWT_SECRET",
        "nos_super_secret_jwt_key_32_chars_min_length_value!",
      );
      let payload: any;
      try {
        payload = await this.jwtService.verifyAsync(token, { secret });
      } catch (err: any) {
        this.logger.warn(
          `JWT verification failed for socket [${client.id}]: ${err.message}`,
        );
        this.metrics.recordAuthFailure();
        client.emit("unauthorized", {
          error: "Invalid JWT signature or token expired.",
        });
        client.disconnect(true);
        return;
      }

      // Verify domain user existence and role authorization
      const user = await this.userRepo.findById(payload.sub);
      if (!user) {
        this.logger.warn(
          `Token identity unknown for socket [${client.id}] sub [${payload.sub}]`,
        );
        this.metrics.recordAuthFailure();
        client.disconnect(true);
        return;
      }

      // Attach verified metadata to socket instance
      (client as any).user = user;
      (client as any).connectedAtMs = startMs;

      // Register session in ConnectionRegistry and update Presence (SPL Features 5 & 6)
      const session = this.registry.registerSession({
        socketId: client.id,
        userId: user.id,
        role: user.role,
        ipAddress: ipAddress.toString(),
      });

      this.presence.updateUserActivity(
        user.id,
        client.id,
        user.role,
        ipAddress.toString(),
      );
      this.metrics.recordClientConnection(
        client.handshake.query.reconnect === "true",
      );

      // Phase 6: Automatically subscribe to Tenant Isolated Room after validating membership
      const requestedOrgId =
        client.handshake.query?.organizationId ||
        client.handshake.headers?.["x-organization-id"] ||
        client.handshake.headers?.["x-tenant-id"] ||
        payload.org;

      const userMemberships = await this.prisma.organizationMember.findMany({
        where: { userId: user.id, isSuspended: false },
        include: {
          organization: {
            include: {
              _count: {
                select: { devices: true },
              },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      });

      let selectedMembership: any = null;
      if (requestedOrgId && requestedOrgId !== "default-org") {
        selectedMembership = userMemberships.find(
          (m) => m.organizationId === requestedOrgId,
        );
      }

      if (!selectedMembership) {
        selectedMembership =
          userMemberships.find(
            (m) => ((m.organization as any)?._count?.devices || 0) > 0,
          ) ||
          userMemberships[0] ||
          null;
      }

      const orgId = selectedMembership?.organizationId || "default-org";

      // Allow all authenticated users with workspace memberships to join dashboard room
      client.join(SocketRooms.DASHBOARD);
      this.registry.addRoom(client.id, SocketRooms.DASHBOARD);

      const orgRoom = `org_${orgId}`;
      client.join(orgRoom);
      this.registry.addRoom(client.id, orgRoom);

      // Send connection acknowledgement with server version envelope
      const ackEnvelope: SocketEventEnvelope = {
        version: 1,
        event: SocketEvents.SYSTEM_STATUS_CHANGED,
        timestamp: new Date().toISOString(),
        correlationId: `conn-${client.id}`,
        payload: {
          message: "Connected securely to NOS Enterprise Realtime Engine.",
          clientId: client.id,
          role: user.role,
          serverTime: new Date().toISOString(),
        },
      };
      client.emit(SocketEvents.SYSTEM_STATUS_CHANGED, ackEnvelope);

      this.logger.debug(
        `Client connected securely: [${client.id}] User [${user.email}] Role [${user.role}]`,
      );
    } catch (err: any) {
      this.logger.error(
        `Fatal exception during socket connection handshake [${client.id}]: ${err.message}`,
        err.stack,
      );
      this.metrics.recordAuthFailure();
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const session = this.registry.removeSession(client.id);
    this.rateLimiter.clearClient(client.id);

    const connectedAt =
      (client as any).connectedAtMs ||
      (session ? session.connectedAt : Date.now());
    const durationMs = Date.now() - connectedAt;

    if (session && session.userId) {
      // Check if user still has other open browser tabs/sockets
      const userSessions = this.registry
        .getAllSessions()
        .filter((s) => s.userId === session.userId);
      if (userSessions.length === 0) {
        this.presence.removeUser(session.userId);
      }
    }

    this.metrics.recordClientDisconnection(durationMs);
    this.logger.debug(
      `Client disconnected [${client.id}] Duration: ${Math.round(durationMs / 1000)}s`,
    );
  }

  /**
   * Room Based Authorization (SPL Feature 3 & 4)
   * Validates client RBAC before allowing subscription to specific namespaces.
   */
  @SubscribeMessage("joinRoom")
  async handleJoinRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ): Promise<{ status: string; room: string; timestamp: string }> {
    const user = (client as any).user;
    if (!user) {
      throw new UnauthorizedException("Socket unauthenticated.");
    }

    // Protect against Join Spam (SPL Feature 12)
    if (!this.rateLimiter.checkLimit(client.id, "join", 15, 60)) {
      this.metrics.recordDroppedEvent();
      return {
        status: "ERROR_RATE_LIMITED",
        room,
        timestamp: new Date().toISOString(),
      };
    }

    await this.authorizeRoomAccess(user, room);

    client.join(room);
    this.registry.addRoom(client.id, room);
    this.logger.debug(
      `Socket [${client.id}] User [${user.email}] joined authorized room [${room}]`,
    );

    return { status: "JOINED", room, timestamp: new Date().toISOString() };
  }

  @SubscribeMessage("leaveRoom")
  handleLeaveRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ): { status: string; room: string; timestamp: string } {
    client.leave(room);
    this.registry.removeRoom(client.id, room);
    return { status: "LEFT", room, timestamp: new Date().toISOString() };
  }

  /**
   * Latency Monitoring (SPL Feature 19)
   * Calculates network round-trip time between client and gateway.
   */
  @SubscribeMessage("ping")
  handlePing(
    @MessageBody() clientTimeMs: number,
    @ConnectedSocket() client: Socket,
  ) {
    const now = Date.now();
    if (
      typeof clientTimeMs === "number" &&
      clientTimeMs > 0 &&
      clientTimeMs <= now
    ) {
      const oneWayMs = Math.max(1, Math.round((now - clientTimeMs) / 2));
      this.metrics.updateLatency(oneWayMs);
    }
    const user = (client as any).user;
    if (user) {
      this.presence.updateUserActivity(
        user.id,
        client.id,
        user.role,
        client.handshake.address,
      );
    }
    return { pong: now, serverTime: new Date().toISOString() };
  }

  private extractToken(client: Socket): string | null {
    const authToken =
      client.handshake.auth?.token || client.handshake.query?.token;
    if (authToken && typeof authToken === "string") {
      return authToken.replace(/^Bearer\s+/i, "");
    }
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && typeof authHeader === "string") {
      return authHeader.replace(/^Bearer\s+/i, "");
    }
    return null;
  }

  private async authorizeRoomAccess(user: any, room: string): Promise<void> {
    if (!room) {
      throw new ForbiddenException("Invalid room parameter.");
    }

    // Super Admin overrides all room locks
    if (user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (room.startsWith("org_") || room.startsWith("org:")) {
      const targetOrg = room.replace(/^org[_:]/, "");
      const membership = await this.prisma.organizationMember.findFirst({
        where: {
          userId: user.id,
          organizationId: targetOrg,
          isSuspended: false,
        },
      });
      if (!membership) {
        throw new ForbiddenException(
          `Access to organization room [${room}] denied.`,
        );
      }
      return;
    }

    if (room === SocketRooms.ADMINS && user.role !== UserRole.ADMIN) {
      this.logger.warn(
        `User [${user.email}] (Role: ${user.role}) denied access to room [${room}]`,
      );
      throw new ForbiddenException("Room requires ADMIN privileges.");
    }

    if (
      room === SocketRooms.OPERATORS &&
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.OPERATOR
    ) {
      this.logger.warn(`User [${user.email}] denied access to room [${room}]`);
      throw new ForbiddenException(
        "Room requires OPERATOR or higher privileges.",
      );
    }

    if (room === SocketRooms.DASHBOARD) {
      // Any authenticated user with active account is authorized to view the dashboard
      return;
    }

    if (room.startsWith("device:")) {
      const targetDeviceId = room.replace(/^device:/, "");
      const userMemberships = await this.prisma.organizationMember.findMany({
        where: { userId: user.id, isSuspended: false },
        select: { organizationId: true },
      });
      const allowedOrgIds = userMemberships.map((m) => m.organizationId);
      if (
        user.role === UserRole.SUPER_ADMIN ||
        user.role === UserRole.ADMIN ||
        user.role === UserRole.OWNER
      ) {
        allowedOrgIds.push("default-org");
      }
      const device = await this.prisma.device.findFirst({
        where: {
          OR: [{ id: targetDeviceId }, { uuid: targetDeviceId }],
          ...(allowedOrgIds.length > 0
            ? {
                OR: [
                  { organizationId: { in: allowedOrgIds } },
                  { tenantId: { in: allowedOrgIds } },
                  { organizationId: null, tenantId: null },
                ],
              }
            : {}),
        },
      });
      if (!device) {
        throw new ForbiddenException(`Access to device room [${room}] denied.`);
      }
      return;
    }
  }
}
