import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../database/prisma.service";
import { TelemetryAggregationService } from "./telemetry-aggregation.service";
import { TelemetryRetentionService } from "./telemetry-retention.service";

@Injectable()
export class TelemetryCronService {
  private readonly logger = new Logger(TelemetryCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aggregationService: TelemetryAggregationService,
    private readonly retentionService: TelemetryRetentionService,
  ) {}

  /**
   * Runs every 1 minute: rolls up raw telemetry data from the last 5 minutes into 1-minute buckets.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handle1MinuteAggregation(): Promise<void> {
    const lockKey = "aggregation_lock_1m";
    if (!(await this.acquireLock(lockKey))) {
      this.logger.warn(
        "[1m] Telemetry aggregation already RUNNING. Skipping scheduled run.",
      );
      return;
    }

    try {
      const startTime = new Date();
      this.logger.log(
        `Starting [1m] aggregation schedule at ${startTime.toISOString()}`,
      );

      const result = await this.aggregationService.aggregateSnapshots("1m", 5);

      const duration = Date.now() - startTime.getTime();
      this.logger.log(
        `Completed [1m] schedule run in ${duration}ms — Devices processed: ${result.devicesProcessed}, Rows inserted: ${result.rowsInserted}.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed [1m] scheduled aggregation: ${error instanceof Error ? error.stack : error}`,
      );
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  /**
   * Runs every 15 minutes: rolls up raw data from the last 30 minutes into 15-minute buckets.
   */
  @Cron("0 */15 * * * *")
  async handle15MinuteAggregation(): Promise<void> {
    const lockKey = "aggregation_lock_15m";
    if (!(await this.acquireLock(lockKey))) {
      this.logger.warn(
        "[15m] Telemetry aggregation already RUNNING. Skipping scheduled run.",
      );
      return;
    }

    try {
      const startTime = new Date();
      this.logger.log(
        `Starting [15m] aggregation schedule at ${startTime.toISOString()}`,
      );

      const result = await this.aggregationService.aggregateSnapshots(
        "15m",
        30,
      );

      const duration = Date.now() - startTime.getTime();
      this.logger.log(
        `Completed [15m] schedule run in ${duration}ms — Devices processed: ${result.devicesProcessed}, Rows inserted: ${result.rowsInserted}.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed [15m] scheduled aggregation: ${error instanceof Error ? error.stack : error}`,
      );
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  /**
   * Runs every 1 hour: rolls up raw data from the last 6 hours into 1-hour buckets.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handle1HourAggregation(): Promise<void> {
    const lockKey = "aggregation_lock_1h";
    if (!(await this.acquireLock(lockKey))) {
      this.logger.warn(
        "[1h] Telemetry aggregation already RUNNING. Skipping scheduled run.",
      );
      return;
    }

    try {
      const startTime = new Date();
      this.logger.log(
        `Starting [1h] aggregation schedule at ${startTime.toISOString()}`,
      );

      const result = await this.aggregationService.aggregateSnapshots(
        "1h",
        360,
      );

      const duration = Date.now() - startTime.getTime();
      this.logger.log(
        `Completed [1h] schedule run in ${duration}ms — Devices processed: ${result.devicesProcessed}, Rows inserted: ${result.rowsInserted}.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed [1h] scheduled aggregation: ${error instanceof Error ? error.stack : error}`,
      );
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  /**
   * Runs daily at 2:00 AM: rolls up raw data from the last 24 hours into daily buckets.
   */
  @Cron("0 0 2 * * *")
  async handleDailyAggregation(): Promise<void> {
    const lockKey = "aggregation_lock_1d";
    if (!(await this.acquireLock(lockKey))) {
      this.logger.warn(
        "[1d] Telemetry aggregation already RUNNING. Skipping scheduled run.",
      );
      return;
    }

    try {
      const startTime = new Date();
      this.logger.log(
        `Starting [1d] daily aggregation schedule at ${startTime.toISOString()}`,
      );

      const result = await this.aggregationService.aggregateSnapshots(
        "1d",
        1440,
      );

      const duration = Date.now() - startTime.getTime();
      this.logger.log(
        `Completed [1d] schedule run in ${duration}ms — Devices processed: ${result.devicesProcessed}, Rows inserted: ${result.rowsInserted}.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed [1d] scheduled aggregation: ${error instanceof Error ? error.stack : error}`,
      );
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  /**
   * Runs daily at 2:05 AM (5 minutes after daily aggregation): executes data purge & table VACUUM.
   */
  @Cron("0 5 2 * * *")
  async handleDailyRetentionPurge(): Promise<void> {
    const lockKey = "retention_purge_lock";
    if (!(await this.acquireLock(lockKey))) {
      this.logger.warn(
        "Telemetry data retention purge already RUNNING. Skipping scheduled run.",
      );
      return;
    }

    try {
      this.logger.log(
        `Triggering daily data retention purge schedule at ${new Date().toISOString()}...`,
      );
      await this.retentionService.purgeOldData();
    } catch (error) {
      this.logger.error(
        `Failed daily retention purge: ${error instanceof Error ? error.stack : error}`,
      );
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  private async acquireLock(key: string): Promise<boolean> {
    try {
      const current = await this.prisma.keyValue.findUnique({ where: { key } });
      if (current && current.value === "RUNNING") {
        return false;
      }
      await this.prisma.keyValue.upsert({
        where: { key },
        update: { value: "RUNNING" },
        create: { key, value: "RUNNING" },
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Error acquiring KeyValue lock [${key}]: ${error instanceof Error ? error.message : error}`,
      );
      // On connection/locking failure, default to preventing overlapping run to avoid race condition
      return false;
    }
  }

  private async releaseLock(key: string): Promise<void> {
    try {
      await this.prisma.keyValue.upsert({
        where: { key },
        update: { value: "IDLE" },
        create: { key, value: "IDLE" },
      });
    } catch (error) {
      this.logger.error(
        `Error releasing KeyValue lock [${key}]: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
