import { Injectable, OnApplicationShutdown, Inject } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { LoggerService } from "../logger/logger.service";
import { RealtimeGateway } from "../../modules/realtime/realtime.gateway";

// Declare a global boolean for health checks
declare global {
  var isShuttingDown: boolean;
}
global.isShuttingDown = false;

@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private logger = new LoggerService();

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway?: RealtimeGateway,
  ) {
    this.logger.setContext(GracefulShutdownService.name);
  }

  async onApplicationShutdown(signal?: string) {
    global.isShuttingDown = true;
    this.logger.log(
      `SIGTERM/SIGINT received (${signal}). Starting graceful shutdown...`,
    );

    // Safety timeout to force exit if graceful shutdown takes too long (15s limit as per requirement)
    const forceExitTimeout = setTimeout(() => {
      this.logger.error(
        "Graceful shutdown took longer than 15s. Forcing exit.",
      );
      process.exit(1);
    }, 15000);
    forceExitTimeout.unref();

    // 1. Wait 10 seconds for in-flight HTTP requests to finish
    await new Promise((resolve) => setTimeout(resolve, 10000));

    try {
      // 2. Close Socket.IO server
      if (this.realtimeGateway && this.realtimeGateway.server) {
        this.logger.log("Closing Socket.IO server connections...");
        this.realtimeGateway.server.close();
      }

      // 3. Close Prisma connection
      this.logger.log("Disconnecting from PostgreSQL database...");
      await this.prisma.$disconnect();
    } catch (err) {
      this.logger.error(
        "Error during shutdown cleanup",
        err instanceof Error ? err.stack : undefined,
      );
    }

    this.logger.log("Graceful shutdown complete. Exiting.");
    clearTimeout(forceExitTimeout);
    process.exit(0);
  }
}
