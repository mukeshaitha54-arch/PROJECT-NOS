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
