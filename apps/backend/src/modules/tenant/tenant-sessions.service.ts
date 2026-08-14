import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TenantSessionsService {
  private readonly logger = new Logger(TenantSessionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getActiveSessions() {
    const [refreshTokens, userSessions] = await Promise.all([
      this.prisma.refreshToken.findMany({
        where: { isRevoked: false },
        include: { user: true },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.userSession.findMany({
        where: { isRevoked: false, isActive: true },
      }),
    ]);

    const sessionMap = new Map<string, any>();
    for (const session of userSessions) {
      if (
        !sessionMap.has(session.userId) ||
        session.lastUsedAt > sessionMap.get(session.userId).lastUsedAt
      ) {
        sessionMap.set(session.userId, session);
      }
    }

    const sessions = refreshTokens.map((token) => {
      const user = token.user || ({} as any);
      const activeSession = sessionMap.get(token.userId);
      const name =
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.email ||
        "Unknown User";
      const lastActive = activeSession?.lastUsedAt
        ? activeSession.lastUsedAt.toISOString()
        : token.createdAt.toISOString();
      const ipAddress = activeSession?.ipAddress || "127.0.0.1";
      const userAgent = activeSession?.browser || "NOS-Web-Console/7.0";

      return {
        userId: token.userId,
        name,
        email: user.email || "unknown@nos.io",
        role: user.role || "VIEWER",
        lastActive,
        ipAddress,
        userAgent,
      };
    });

    return {
      success: true,
      data: {
        sessions,
      },
    };
  }
}
