import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: { db: { url: process.env.DATABASE_URL } },
      log:
        process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log(
        "📦 Connected to PostgreSQL database via Prisma Client successfully.",
      );

      // Safe, non-destructive schema guard: ensure devices.telemetryPaused exists
      try {
        await this.$executeRawUnsafe(
          `ALTER TABLE devices ADD COLUMN IF NOT EXISTS "telemetryPaused" BOOLEAN NOT NULL DEFAULT false;`,
        );
        this.logger.log(
          "✅ Verified devices.telemetryPaused column exists in PostgreSQL.",
        );
      } catch (colErr: any) {
        this.logger.warn(`Column check warning: ${colErr.message}`);
      }
    } catch (error) {
      this.logger.error(
        "❌ Failed to establish PostgreSQL connection via Prisma:",
        error,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("🛑 Disconnected Prisma PostgreSQL client.");
  }
}
