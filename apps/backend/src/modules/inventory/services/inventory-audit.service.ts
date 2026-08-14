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
    if (previous.biosVersion !== nextPayload.biosVersion) {
      await repository.createAuditLog(
        deviceId,
        "BIOS Updated",
        `BIOS version migrated from ${previous.biosVersion} to ${nextPayload.biosVersion}.`,
      );
      diffCount++;
    }

    // 2. Check Windows / OS Updates
    if (
      previous.osBuild !== nextPayload.osBuild ||
      previous.osEdition !== nextPayload.osEdition
    ) {
      await repository.createAuditLog(
        deviceId,
        "Windows Updated",
        `OS build transitioned from ${previous.osEdition} (${previous.osBuild}) to ${nextPayload.osEdition} (${nextPayload.osBuild}).`,
      );
      diffCount++;
    }

    // 3. Hardware Added / Removed (Memory & Disks & GPUs)
    const prevDiskSerials = new Set(
      previous.diskDrives?.map((d) => d.serialNumber) || [],
    );
    const nextDiskSerials = new Set(
      nextPayload.diskDrives.map((d) => d.serialNumber),
    );

    for (const d of nextPayload.diskDrives) {
      if (!prevDiskSerials.has(d.serialNumber)) {
        await repository.createAuditLog(
          deviceId,
          "Hardware Added",
          `Disk Drive added: ${d.model} (${d.driveName}, ${(d.sizeBytes / 1024 ** 3).toFixed(1)} GB).`,
        );
        diffCount++;
      }
    }
    for (const d of previous.diskDrives || []) {
      if (!nextDiskSerials.has(d.serialNumber)) {
        await repository.createAuditLog(
          deviceId,
          "Hardware Removed",
          `Disk Drive removed: ${d.model} (${d.driveName}, ${(d.sizeBytes / 1024 ** 3).toFixed(1)} GB).`,
        );
        diffCount++;
      }
    }

    const prevRamSerials = new Set(
      previous.memoryModules?.map((m) => m.serialNumber) || [],
    );
    const nextRamSerials = new Set(
      nextPayload.memoryModules.map((m) => m.serialNumber),
    );
    if (prevRamSerials.size !== nextRamSerials.size) {
      if (
        nextPayload.memoryModules.length > (previous.memoryModules?.length || 0)
      ) {
        await repository.createAuditLog(
          deviceId,
          "Hardware Added",
          `Memory module capacity expanded to ${nextPayload.memoryModules.length} DIMM slots.`,
        );
        diffCount++;
      } else if (
        nextPayload.memoryModules.length < (previous.memoryModules?.length || 0)
      ) {
        await repository.createAuditLog(
          deviceId,
          "Hardware Removed",
          `Memory module capacity decreased from ${previous.memoryModules?.length || 0} to ${nextPayload.memoryModules.length} DIMM slots.`,
        );
        diffCount++;
      }
    }

    // 4. Installed / Removed Software
    const prevApps = new Set(
      previous.installedSoftware?.map((s) => s.name.toLowerCase()) || [],
    );
    const nextApps = new Set(
      nextPayload.installedSoftware.map((s) => s.name.toLowerCase()),
    );

    const newInstalled: string[] = [];
    const removed: string[] = [];

    for (const app of nextPayload.installedSoftware) {
      if (!prevApps.has(app.name.toLowerCase())) {
        newInstalled.push(`${app.name} (${app.version})`);
      }
    }
    for (const app of previous.installedSoftware || []) {
      if (!nextApps.has(app.name.toLowerCase())) {
        removed.push(app.name);
      }
    }

    if (newInstalled.length > 0) {
      const summary =
        newInstalled.slice(0, 5).join(", ") +
        (newInstalled.length > 5 ? ` (+${newInstalled.length - 5} more)` : "");
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
        ?.map((n) => n.ipv4)
        .filter((ip) => ip !== "0.0.0.0") || [],
    );
    const nextIps = new Set(
      nextPayload.networkAdapters
        .map((n) => n.ipv4)
        .filter((ip) => ip !== "0.0.0.0"),
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
  }
}
