import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";
import { SubmitInventoryPayload, DeviceInventoryDto } from "@nos/shared-types";
import { IInventoryRepository } from "../../../common/repositories/inventory.repository.interface";

@Injectable()
export class InventoryAuditService {
  private readonly logger = new Logger(InventoryAuditService.name);

  /**
   * Generates immutable SHA-256 asset fingerprint from hardware anchor points:
   * Serial Number + Motherboard + CPU + Primary MAC + BIOS Version
   */
  calculateAssetFingerprint(payload: SubmitInventoryPayload): string {
    const primaryMac =
      payload.networkAdapters?.find((n) => n.isPhysical && n.isOperational)
        ?.macAddress ||
      payload.networkAdapters?.[0]?.macAddress ||
      "00:00:00:00:00:00";

    const rawString =
      `${payload.serialNumber}|${payload.motherboard}|${payload.cpuModel}|${primaryMac}|${payload.biosVersion}`.toLowerCase();
    return crypto.createHash("sha256").update(rawString).digest("hex");
  }

  /**
   * Inventory Difference Engine: Compares previous stored baseline against new incoming scan.
   * Emits precise audit event records without UI coupling.
   */
  async detectAndLogDifferences(
    deviceId: string,
    previous: DeviceInventoryDto | null,
    nextPayload: SubmitInventoryPayload,
    repository: IInventoryRepository,
  ): Promise<void> {
    try {
      if (!previous) {
        await repository.createAuditLog(
          deviceId,
          "Inventory Created",
          "Initial system asset and hardware baseline established.",
        );
        return;
      }

      let diffCount = 0;

      // 1. Check BIOS Updates
      if (
        nextPayload.biosVersion &&
        previous.biosVersion !== nextPayload.biosVersion
      ) {
        await repository.createAuditLog(
          deviceId,
          "BIOS Updated",
          `BIOS version migrated from ${previous.biosVersion || "Unknown"} to ${nextPayload.biosVersion}.`,
        );
        diffCount++;
      }

      // 2. Check Windows / OS Updates
      if (
        (nextPayload.osBuild && previous.osBuild !== nextPayload.osBuild) ||
        (nextPayload.osEdition && previous.osEdition !== nextPayload.osEdition)
      ) {
        await repository.createAuditLog(
          deviceId,
          "Windows Updated",
          `OS build transitioned from ${previous.osEdition || "Unknown"} (${previous.osBuild || ""}) to ${nextPayload.osEdition || ""} (${nextPayload.osBuild || ""}).`,
        );
        diffCount++;
      }

      // 3. Hardware Added / Removed (Memory & Disks & GPUs)
      const prevDiskSerials = new Set(
        previous.diskDrives?.map((d) => d?.serialNumber).filter(Boolean) || [],
      );
      const nextDiskDrives = nextPayload.diskDrives || [];
      const nextDiskSerials = new Set(
        nextDiskDrives.map((d) => d?.serialNumber).filter(Boolean),
      );

      for (const d of nextDiskDrives) {
        if (d?.serialNumber && !prevDiskSerials.has(d.serialNumber)) {
          const gbSize = d.sizeBytes
            ? (d.sizeBytes / 1024 ** 3).toFixed(1)
            : "0";
          await repository.createAuditLog(
            deviceId,
            "Hardware Added",
            `Disk Drive added: ${d.model || "Disk"} (${d.driveName || "Drive"}, ${gbSize} GB).`,
          );
          diffCount++;
        }
      }
      for (const d of previous.diskDrives || []) {
        if (d?.serialNumber && !nextDiskSerials.has(d.serialNumber)) {
          const gbSize = d.sizeBytes
            ? (d.sizeBytes / 1024 ** 3).toFixed(1)
            : "0";
          await repository.createAuditLog(
            deviceId,
            "Hardware Removed",
            `Disk Drive removed: ${d.model || "Disk"} (${d.driveName || "Drive"}, ${gbSize} GB).`,
          );
          diffCount++;
        }
      }

      const prevRamSerials = new Set(
        previous.memoryModules?.map((m) => m?.serialNumber).filter(Boolean) ||
          [],
      );
      const nextMemoryModules = nextPayload.memoryModules || [];
      const nextRamSerials = new Set(
        nextMemoryModules.map((m) => m?.serialNumber).filter(Boolean),
      );
      if (prevRamSerials.size !== nextRamSerials.size) {
        if (nextMemoryModules.length > (previous.memoryModules?.length || 0)) {
          await repository.createAuditLog(
            deviceId,
            "Hardware Added",
            `Memory module capacity expanded to ${nextMemoryModules.length} DIMM slots.`,
          );
          diffCount++;
        } else if (
          nextMemoryModules.length < (previous.memoryModules?.length || 0)
        ) {
          await repository.createAuditLog(
            deviceId,
            "Hardware Removed",
            `Memory module capacity decreased from ${previous.memoryModules?.length || 0} to ${nextMemoryModules.length} DIMM slots.`,
          );
          diffCount++;
        }
      }

      // 4. Installed / Removed Software
      const prevApps = new Set(
        previous.installedSoftware
          ?.map((s) => (s?.name ? s.name.toLowerCase().trim() : ""))
          .filter(Boolean) || [],
      );
      const nextInstalledSoftware = nextPayload.installedSoftware || [];
      const nextApps = new Set(
        nextInstalledSoftware
          .map((s) => (s?.name ? s.name.toLowerCase().trim() : ""))
          .filter(Boolean),
      );

      const newInstalled: string[] = [];
      const removed: string[] = [];

      for (const app of nextInstalledSoftware) {
        const appName = app?.name ? app.name.trim() : "";
        if (appName && !prevApps.has(appName.toLowerCase())) {
          newInstalled.push(`${appName} (${app?.version || ""})`);
        }
      }
      for (const app of previous.installedSoftware || []) {
        const appName = app?.name ? app.name.trim() : "";
        if (appName && !nextApps.has(appName.toLowerCase())) {
          removed.push(appName);
        }
      }

      if (newInstalled.length > 0) {
        const summary =
          newInstalled.slice(0, 5).join(", ") +
          (newInstalled.length > 5
            ? ` (+${newInstalled.length - 5} more)`
            : "");
        await repository.createAuditLog(
          deviceId,
          "Software Installed",
          `New software detected: ${summary}.`,
        );
        diffCount++;
      }
      if (removed.length > 0) {
        const summary =
          removed.slice(0, 5).join(", ") +
          (removed.length > 5 ? ` (+${removed.length - 5} more)` : "");
        await repository.createAuditLog(
          deviceId,
          "Software Removed",
          `Software uninstalled or removed: ${summary}.`,
        );
        diffCount++;
      }

      // 5. Network Changed
      const prevIps = new Set(
        previous.networkAdapters
          ?.map((n) => n?.ipv4)
          .filter((ip): ip is string => Boolean(ip) && ip !== "0.0.0.0") || [],
      );
      const nextNetworkAdapters = nextPayload.networkAdapters || [];
      const nextIps = new Set(
        nextNetworkAdapters
          .map((n) => n?.ipv4)
          .filter((ip): ip is string => Boolean(ip) && ip !== "0.0.0.0"),
      );
      let networkChanged = false;
      if (prevIps.size !== nextIps.size) {
        networkChanged = true;
      } else {
        for (const ip of nextIps) {
          if (!prevIps.has(ip)) networkChanged = true;
        }
      }
      if (networkChanged) {
        await repository.createAuditLog(
          deviceId,
          "Network Changed",
          `Active IPv4 assignment modified from [${Array.from(prevIps).join(", ")}] to [${Array.from(nextIps).join(", ")}].`,
        );
        diffCount++;
      }

      // 6. Overall Update vs Routine Refresh
      if (diffCount > 0) {
        await repository.createAuditLog(
          deviceId,
          "Inventory Updated",
          `Asset difference engine detected ${diffCount} system changes during inventory cycle.`,
        );
      } else {
        await repository.createAuditLog(
          deviceId,
          "Inventory Refreshed",
          "Routine asset verification completed without configuration anomalies or structural changes.",
        );
      }
    } catch (auditErr) {
      this.logger.warn(`Non-fatal audit logging warning: ${auditErr}`);
      try {
        await repository.createAuditLog(
          deviceId,
          "Inventory Refreshed",
          "Routine asset verification completed.",
        );
      } catch {}
    }
  }
}
