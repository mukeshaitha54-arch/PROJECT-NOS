import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { TelemetrySnapshot, Prisma } from "@prisma/client";

export type Granularity = "1m" | "15m" | "1h" | "1d";

interface BucketAggregation {
  deviceId: string;
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  avgCpu: number;
  maxCpu: number;
  minCpu: number;
  avgRam: number;
  maxRam: number;
  avgDisk: number;
  avgNetwork: number;
  sampleCount: number;
}

@Injectable()
export class TelemetryAggregationService {
  private readonly logger = new Logger(TelemetryAggregationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Rolls up raw TelemetrySnapshot data into TelemetryAggregation tables for a given granularity.
   * Uses KeyValue tracking to only process unprocessed snapshots since the last run time.
   */
  async aggregateSnapshots(
    granularity: Granularity,
    defaultWindowMinutes?: number,
  ): Promise<{ devicesProcessed: number; rowsInserted: number }> {
    const startTime = Date.now();
    this.logger.log(
      `Starting telemetry aggregation cycle for granularity [${granularity}]...`,
    );

    const keyName = `aggregation_last_run_${granularity}`;
    const lastRunRecord = await this.prisma.keyValue.findUnique({
      where: { key: keyName },
    });

    const now = new Date();
    let lastRun: Date;

    if (lastRunRecord && lastRunRecord.value) {
      lastRun = new Date(lastRunRecord.value);
      if (isNaN(lastRun.getTime())) {
        lastRun = this.getDefaultLastRun(
          granularity,
          defaultWindowMinutes,
          now,
        );
      }
    } else {
      lastRun = this.getDefaultLastRun(granularity, defaultWindowMinutes, now);
    }

    // Fetch new raw telemetry snapshots
    const snapshots = await this.prisma.telemetrySnapshot.findMany({
      where: {
        timestamp: {
          gt: lastRun,
          lte: now,
        },
      },
      orderBy: { timestamp: "asc" },
      include: {
        device: {
          select: { id: true, organizationId: true },
        },
      },
    });

    if (snapshots.length === 0) {
      this.logger.log(
        `No new telemetry snapshots found since [${lastRun.toISOString()}] for granularity [${granularity}]. Returning early.`,
      );
      // Still update the last run marker to current check time to avoid re-evaluating empty gaps
      await this.prisma.keyValue.upsert({
        where: { key: keyName },
        update: { value: now.toISOString() },
        create: { key: keyName, value: now.toISOString() },
      });
      return { devicesProcessed: 0, rowsInserted: 0 };
    }

    const distinctDeviceIds = new Set<string>();
    const bucketMap = new Map<
      string,
      Array<TelemetrySnapshot & { tenantId: string }>
    >();
    const bucketDurationMs = this.getBucketDurationMs(granularity);

    // Group snapshots by deviceId and bucket interval
    for (const snap of snapshots) {
      distinctDeviceIds.add(snap.deviceId);
      const tenantId = (snap as any).device?.organizationId || "default-org";
      const bucketStart = this.calculateBucketStart(
        snap.timestamp,
        granularity,
        bucketDurationMs,
      );
      const groupKey = `${snap.deviceId}__${bucketStart.getTime()}`;

      let group = bucketMap.get(groupKey);
      if (!group) {
        group = [];
        bucketMap.set(groupKey, group);
      }
      group.push({ ...snap, tenantId });
    }

    const aggregatedBuckets: BucketAggregation[] = [];

    for (const [_, group] of bucketMap) {
      if (group.length === 0) continue;

      const sample = group[0];
      const periodStart = this.calculateBucketStart(
        sample.timestamp,
        granularity,
        bucketDurationMs,
      );
      const periodEnd = new Date(periodStart.getTime() + bucketDurationMs);

      // Extract valid numbers, handling any null/undefined/NaN safely
      const cpuValues = group
        .map((g) => g.cpuUsage)
        .filter((val) => val != null && !isNaN(val));
      const ramValues = group
        .map((g) => g.memoryUsagePercent)
        .filter((val) => val != null && !isNaN(val));
      const diskValues = group
        .map((g) => g.diskUsagePercent)
        .filter((val) => val != null && !isNaN(val));
      const netValues = group
        .map((g) => (g.networkUploadSpeed ?? 0) + (g.networkDownloadSpeed ?? 0))
        .filter((val) => val != null && !isNaN(val));

      const avgCpu = cpuValues.length
        ? cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length
        : 0;
      const maxCpu = cpuValues.length ? Math.max(...cpuValues) : 0;
      const minCpu = cpuValues.length ? Math.min(...cpuValues) : 0;

      const avgRam = ramValues.length
        ? ramValues.reduce((a, b) => a + b, 0) / ramValues.length
        : 0;
      const maxRam = ramValues.length ? Math.max(...ramValues) : 0;

      const avgDisk = diskValues.length
        ? diskValues.reduce((a, b) => a + b, 0) / diskValues.length
        : 0;
      const avgNetwork = netValues.length
        ? netValues.reduce((a, b) => a + b, 0) / netValues.length
        : 0;

      aggregatedBuckets.push({
        deviceId: sample.deviceId,
        tenantId: sample.tenantId,
        periodStart,
        periodEnd,
        avgCpu: Math.round(avgCpu * 100) / 100,
        maxCpu: Math.round(maxCpu * 100) / 100,
        minCpu: Math.round(minCpu * 100) / 100,
        avgRam: Math.round(avgRam * 100) / 100,
        maxRam: Math.round(maxRam * 100) / 100,
        avgDisk: Math.round(avgDisk * 100) / 100,
        avgNetwork: Math.round(avgNetwork * 100) / 100,
        sampleCount: group.length,
      });
    }

    // Execute atomic batch transaction
    const transactions: Prisma.PrismaPromise<any>[] = [];

    for (const bucket of aggregatedBuckets) {
      transactions.push(
        this.prisma.telemetryAggregation.create({
          data: {
            deviceId: bucket.deviceId,
            tenantId: bucket.tenantId,
            tier: granularity,
            granularity: granularity,
            avgCpu: bucket.avgCpu,
            maxCpu: bucket.maxCpu,
            minCpu: bucket.minCpu,
            avgRam: bucket.avgRam,
            maxRam: bucket.maxRam,
            avgDisk: bucket.avgDisk,
            avgNetwork: bucket.avgNetwork,
            sampleCount: bucket.sampleCount,
            periodStart: bucket.periodStart,
            periodEnd: bucket.periodEnd,
          },
        }),
      );
    }

    transactions.push(
      this.prisma.keyValue.upsert({
        where: { key: keyName },
        update: { value: now.toISOString() },
        create: { key: keyName, value: now.toISOString() },
      }),
    );

    await this.prisma.$transaction(transactions);

    const duration = Date.now() - startTime;
    this.logger.log(
      `Completed aggregation for [${granularity}] in ${duration}ms. Processed ${distinctDeviceIds.size} device(s), inserted ${aggregatedBuckets.length} aggregation row(s).`,
    );

    return {
      devicesProcessed: distinctDeviceIds.size,
      rowsInserted: aggregatedBuckets.length,
    };
  }

  private getDefaultLastRun(
    granularity: Granularity,
    customMinutes: number | undefined,
    now: Date,
  ): Date {
    const minutes =
      customMinutes ??
      (granularity === "1m"
        ? 5
        : granularity === "15m"
          ? 30
          : granularity === "1h"
            ? 360
            : 1440);
    return new Date(now.getTime() - minutes * 60 * 1000);
  }

  private getBucketDurationMs(granularity: Granularity): number {
    switch (granularity) {
      case "1m":
        return 60 * 1000;
      case "15m":
        return 15 * 60 * 1000;
      case "1h":
        return 60 * 60 * 1000;
      case "1d":
        return 24 * 60 * 60 * 1000;
    }
  }

  private calculateBucketStart(
    timestamp: Date,
    granularity: Granularity,
    bucketMs: number,
  ): Date {
    if (granularity === "1d") {
      const day = new Date(timestamp);
      day.setUTCHours(0, 0, 0, 0);
      return day;
    }
    const ms = timestamp.getTime();
    return new Date(Math.floor(ms / bucketMs) * bucketMs);
  }
}
