import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/database/prisma.service";
import { ApiResponse, SystemStatus } from "@nos/shared-types";

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSystemStatus(requestId?: string): Promise<ApiResponse> {
    let dbStatus = SystemStatus.HEALTHY;
    let dbMessage = "PostgreSQL database operational";

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      this.logger.warn(
        "Health diagnostics check: Database connection unresponsive.",
      );
      dbStatus = SystemStatus.DEGRADED;
      dbMessage = "Database connectivity degraded or unreachable";
    }

    return {
      success: true,
      data: {
        status: dbStatus,
        service: "nos-backend-fastify",
        uptime: process.uptime(),
        database: {
          status: dbStatus,
          message: dbMessage,
        },
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
  }
}
