import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class TelemetryRetentionService {
  private readonly logger = new Logger(TelemetryRetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Purges historical telemetry snapshots and fine-grained aggregations based on defined retention policies.
   * Scheduled daily at 2:05 AM by TelemetryCronService.
   */
  async purgeOldData(): Promise<void> {
    const startTime = Date.now();
    this.logger.log("Starting daily telemetry retention and data purge job...");

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    try {
      // 1. Delete raw snapshots older than 7 days
      const delSnapshots = await this.prisma.telemetrySnapshot.deleteMany({
        where: {
          timestamp: { lt: sevenDaysAgo },
        },
      });
      this.logger.log(
        `Purged ${delSnapshots.count} raw telemetry snapshot(s) older than 7 days.`,
      );

      // 2. Delete '1m' aggregations older than 30 days
      const del1m = await this.prisma.telemetryAggregation.deleteMany({
        where: {
          OR: [{ granularity: "1m" }, { tier: "1m" }],
          periodStart: { lt: thirtyDaysAgo },
        },
      });
      this.logger.log(
        `Purged ${del1m.count} [1m] aggregated records older than 30 days.`,
      );

      // 3. Delete '15m' aggregations older than 90 days
      const del15m = await this.prisma.telemetryAggregation.deleteMany({
        where: {
          OR: [{ granularity: "15m" }, { tier: "15m" }],
          periodStart: { lt: ninetyDaysAgo },
        },
      });
      this.logger.log(
        `Purged ${del15m.count} [15m] aggregated records older than 90 days.`,
      );

      // 4. Delete '1h' aggregations older than 1 year (keep '1d' aggregates forever)
      const del1h = await this.prisma.telemetryAggregation.deleteMany({
        where: {
          OR: [{ granularity: "1h" }, { tier: "1h" }],
          periodStart: { lt: oneYearAgo },
        },
      });
      this.logger.log(
        `Purged ${del1h.count} [1h] aggregated records older than 1 year.`,
      );

      // 5. Attempt database table optimization / VACUUM (supported in PostgreSQL/SQLite, skipped if unsupported)
      try {
        await this.prisma.$queryRawUnsafe("VACUUM telemetry_snapshots;");
        await this.prisma.$queryRawUnsafe("VACUUM telemetry_aggregations;");
        this.logger.log("Successfully executed VACUUM on telemetry tables.");
      } catch (vacuumErr) {
        this.logger.debug(
          `VACUUM operation skipped (not supported by current engine or restricted): ${
            vacuumErr instanceof Error ? vacuumErr.message : vacuumErr
          }`,
        );
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Telemetry data retention purge completed successfully in ${duration}ms.`,
      );
    } catch (error) {
      this.logger.error(
        `Error executing telemetry data retention purge: ${
          error instanceof Error ? error.stack : error
        }`,
      );
    }
  }
}
