import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Inject, Logger, UnauthorizedException, ForbiddenException, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { UserRole, SocketRooms, SocketEvents, getDeviceRoom, SocketEventEnvelope } from '@nos/shared-types';
import { IUserRepository, IUserRepositoryToken } from '../../common/repositories/user.repository.interface';
import { ConnectionRegistryService } from './services/connection-registry.service';
import { PresenceService } from './services/presence.service';
import { SocketMetricsService } from './services/socket-metrics.service';
import { SocketRateLimiterService } from './services/socket-rate-limiter.service';
import { ISocketPublisherToken, ISocketPublisher } from '../../common/services/socket-publisher.interface';
import { SocketPublisherService } from './services/socket-publisher.service';

@WebSocketGateway({
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || '*',
    credentials: true,
  },
  namespace: process.env.SOCKET_NAMESPACE || '/realtime',
  pingTimeout: Number(process.env.SOCKET_PING_TIMEOUT) || 20000,
  pingInterval: Number(process.env.SOCKET_PING_INTERVAL) || 25000,
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
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
  ) {}

  afterInit(server: Server) {
    this.logger.log(`Enterprise Realtime Gateway initialized on namespace [${process.env.SOCKET_NAMESPACE || '/realtime'}] (Proxy Ready, CORS: ${this.configService.get('SOCKET_CORS_ORIGIN', '*')})`);
    // Bind the server instance to the publisher service
    this.publisher.setServer(server);
  }

  async handleConnection(client: Socket) {
    const startMs = Date.now();
    try {
      // Proxy Ready (SPL Feature 13): Parse real IP from X-Forwarded-For or socket address
      const forwardedFor = client.handshake.headers['x-forwarded-for'];
      const ipAddress = (Array.isArray(forwardedFor) ? forwardedFor[0] : (forwardedFor || client.handshake.address)) || '0.0.0.0';

      // Rate Limiting (SPL Feature 12): Prevent Reconnect & Connect Spam
      if (!this.rateLimiter.checkLimit(ipAddress, 'reconnect', 20, 60)) {
        this.logger.warn(`Connection rejected for [${ipAddress}]: Reconnect spam limit reached.`);
        client.disconnect(true);
        return;
      }

      // Zero Trust Authentication (SPL Feature 2): Validate Bearer token or handshake auth
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Unauthorized socket connection attempt from [${ipAddress}]: Missing token.`);
        this.metrics.recordAuthFailure();
        client.emit('unauthorized', { error: 'Authentication token missing or invalid in socket handshake.' });
        client.disconnect(true);
        return;
      }

      // Verify cryptographic token & identify user/agent
      const secret = this.configService.get<string>('JWT_SECRET', 'nos_super_secret_jwt_key_32_chars_min_length_value!');
      let payload: any;
      try {
        payload = await this.jwtService.verifyAsync(token, { secret });
      } catch (err: any) {
        this.logger.warn(`JWT verification failed for socket [${client.id}]: ${err.message}`);
        this.metrics.recordAuthFailure();
        client.emit('unauthorized', { error: 'Invalid JWT signature or token expired.' });
        client.disconnect(true);
        return;
      }

      // Verify domain user existence and role authorization
      const user = await this.userRepo.findById(payload.sub);
      if (!user) {
        this.logger.warn(`Token identity unknown for socket [${client.id}] sub [${payload.sub}]`);
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

      this.presence.updateUserActivity(user.id, client.id, user.role, ipAddress.toString());
      this.metrics.recordClientConnection(client.handshake.query.reconnect === 'true');

      // Automatically subscribe to common authorized dashboard namespace room
      client.join(SocketRooms.DASHBOARD);
      this.registry.addRoom(client.id, SocketRooms.DASHBOARD);

      // Send connection acknowledgement with server version envelope
      const ackEnvelope: SocketEventEnvelope = {
        version: 1,
        event: SocketEvents.SYSTEM_STATUS_CHANGED,
        timestamp: new Date().toISOString(),
        correlationId: `conn-${client.id}`,
        payload: {
          message: 'Connected securely to NOS Enterprise Realtime Engine.',
          clientId: client.id,
          role: user.role,
          serverTime: new Date().toISOString(),
        },
      };
      client.emit(SocketEvents.SYSTEM_STATUS_CHANGED, ackEnvelope);

      this.logger.debug(`Client connected securely: [${client.id}] User [${user.email}] Role [${user.role}]`);
    } catch (err: any) {
      this.logger.error(`Fatal exception during socket connection handshake [${client.id}]: ${err.message}`, err.stack);
      this.metrics.recordAuthFailure();
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const session = this.registry.removeSession(client.id);
    this.rateLimiter.clearClient(client.id);

    const connectedAt = (client as any).connectedAtMs || (session ? session.connectedAt : Date.now());
    const durationMs = Date.now() - connectedAt;

    if (session && session.userId) {
      // Check if user still has other open browser tabs/sockets
      const userSessions = this.registry.getAllSessions().filter((s) => s.userId === session.userId);
      if (userSessions.length === 0) {
        this.presence.removeUser(session.userId);
      }
    }

    this.metrics.recordClientDisconnection(durationMs);
    this.logger.debug(`Client disconnected [${client.id}] Duration: ${Math.round(durationMs / 1000)}s`);
  }

  /**
   * Room Based Authorization (SPL Feature 3 & 4)
   * Validates client RBAC before allowing subscription to specific namespaces.
   */
  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ): { status: string; room: string; timestamp: string } {
    const user = (client as any).user;
    if (!user) {
      throw new UnauthorizedException('Socket unauthenticated.');
    }

    // Protect against Join Spam (SPL Feature 12)
    if (!this.rateLimiter.checkLimit(client.id, 'join', 15, 60)) {
      this.metrics.recordDroppedEvent();
      return { status: 'ERROR_RATE_LIMITED', room, timestamp: new Date().toISOString() };
    }

    this.authorizeRoomAccess(user, room);

    client.join(room);
    this.registry.addRoom(client.id, room);
    this.logger.debug(`Socket [${client.id}] User [${user.email}] joined authorized room [${room}]`);

    return { status: 'JOINED', room, timestamp: new Date().toISOString() };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ): { status: string; room: string; timestamp: string } {
    client.leave(room);
    this.registry.removeRoom(client.id, room);
    return { status: 'LEFT', room, timestamp: new Date().toISOString() };
  }

  /**
   * Latency Monitoring (SPL Feature 19)
   * Calculates network round-trip time between client and gateway.
   */
  @SubscribeMessage('ping')
  handlePing(@MessageBody() clientTimeMs: number, @ConnectedSocket() client: Socket) {
    const now = Date.now();
    if (typeof clientTimeMs === 'number' && clientTimeMs > 0 && clientTimeMs <= now) {
      const oneWayMs = Math.max(1, Math.round((now - clientTimeMs) / 2));
      this.metrics.updateLatency(oneWayMs);
    }
    const user = (client as any).user;
    if (user) {
      this.presence.updateUserActivity(user.id, client.id, user.role, client.handshake.address);
    }
    return { pong: now, serverTime: new Date().toISOString() };
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token || client.handshake.query?.token;
    if (authToken && typeof authToken === 'string') {
      return authToken.replace(/^Bearer\s+/i, '');
    }
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && typeof authHeader === 'string') {
      return authHeader.replace(/^Bearer\s+/i, '');
    }
    return null;
  }

  private authorizeRoomAccess(user: any, room: string): void {
    if (!room) {
      throw new ForbiddenException('Invalid room parameter.');
    }

    // Super Admin overrides all room locks
    if (user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (room === SocketRooms.ADMINS && user.role !== UserRole.ADMIN) {
      this.logger.warn(`User [${user.email}] (Role: ${user.role}) denied access to room [${room}]`);
      throw new ForbiddenException('Room requires ADMIN privileges.');
    }

    if (
      room === SocketRooms.OPERATORS &&
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.OPERATOR
    ) {
      this.logger.warn(`User [${user.email}] denied access to room [${room}]`);
      throw new ForbiddenException('Room requires OPERATOR or higher privileges.');
    }

    // Anyone authenticated can view standard dashboard or specific device rooms in Phase 4
    if (room === SocketRooms.DASHBOARD || room.startsWith('device:')) {
      return;
    }
  }
}
