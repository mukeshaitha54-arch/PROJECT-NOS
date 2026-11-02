-- ==============================================================================
-- PHASE 3: TELEMETRY SNAPSHOTS POSTGRESQL NATIVE TIME-SERIES PARTITIONING
-- ==============================================================================
-- This script converts the existing `telemetry_snapshots` table into a 
-- declarative partitioned table. It partitions data monthly by `timestamp`.
-- ==============================================================================

BEGIN;

-- 1. Rename existing non-partitioned table
ALTER TABLE "telemetry_snapshots" RENAME TO "telemetry_snapshots_old";

-- 2. Create the new partitioned table matching the exact Prisma schema
CREATE TABLE "telemetry_snapshots" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "cpuUsage" DOUBLE PRECISION NOT NULL,
    "cpuTemperature" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "cpuFrequency" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "logicalProcessors" INTEGER NOT NULL,
    "physicalProcessors" INTEGER NOT NULL,
    "memoryUsed" DOUBLE PRECISION NOT NULL,
    "memoryFree" DOUBLE PRECISION NOT NULL,
    "memoryTotal" DOUBLE PRECISION NOT NULL,
    "memoryUsagePercent" DOUBLE PRECISION NOT NULL,
    "diskReadSpeed" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "diskWriteSpeed" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "diskUsagePercent" DOUBLE PRECISION NOT NULL,
    "diskFree" DOUBLE PRECISION NOT NULL,
    "diskTotal" DOUBLE PRECISION NOT NULL,
    "networkUploadSpeed" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "networkDownloadSpeed" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "bytesSent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "bytesReceived" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "activeConnections" INTEGER NOT NULL DEFAULT 0,
    "runningProcesses" INTEGER NOT NULL DEFAULT 0,
    "runningServices" INTEGER NOT NULL DEFAULT 0,
    "systemUptime" DOUBLE PRECISION NOT NULL,
    "bootTime" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "gateway" TEXT NOT NULL DEFAULT '0.0.0.0',
    "dns" TEXT NOT NULL DEFAULT '8.8.8.8',
    "macAddress" TEXT NOT NULL DEFAULT '00:00:00:00:00:00',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraint required for partitioning: Partition key must be part of Primary Key
    CONSTRAINT "telemetry_snapshots_pkey" PRIMARY KEY ("id", "timestamp"),
    
    CONSTRAINT "telemetry_snapshots_deviceId_fkey" 
        FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE
) PARTITION BY RANGE ("timestamp");

-- 3. Create indices mapped in Prisma
CREATE INDEX "telemetry_snapshots_deviceId_timestamp_idx" ON "telemetry_snapshots"("deviceId", "timestamp" DESC);
CREATE INDEX "telemetry_snapshots_timestamp_idx" ON "telemetry_snapshots"("timestamp");

-- 4. Create initial partitions for Current, Next 3 Months (Can be managed via pg_partman)
-- Using a dynamic approach for August, September, October, November 2026
CREATE TABLE "telemetry_snapshots_y2026m08" PARTITION OF "telemetry_snapshots" FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE "telemetry_snapshots_y2026m09" PARTITION OF "telemetry_snapshots" FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE "telemetry_snapshots_y2026m10" PARTITION OF "telemetry_snapshots" FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE "telemetry_snapshots_y2026m11" PARTITION OF "telemetry_snapshots" FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

-- Default partition for records outside the specified ranges
CREATE TABLE "telemetry_snapshots_default" PARTITION OF "telemetry_snapshots" DEFAULT;

-- 5. Migrate existing data
INSERT INTO "telemetry_snapshots" 
SELECT * FROM "telemetry_snapshots_old";

-- 6. Drop the old unpartitioned table
DROP TABLE "telemetry_snapshots_old";

COMMIT;

-- IMPORTANT: Ensure that subsequent Prisma migrations use `prisma migrate resolve --applied`
-- if they conflict, as this changes the underlying PostgreSQL table topology.
