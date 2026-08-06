import {
  SubmitInventoryPayload,
  DeviceInventoryDto,
  HardwareInventoryResponse,
  SoftwareInventoryResponse,
  NetworkInventoryResponse,
  SecurityInventoryResponse,
  InventoryHealthResponse,
  InventoryAuditLogDto,
} from '@nos/shared-types';

export const IInventoryRepository = Symbol('IInventoryRepository');

export type InventoryAuditAction =
  | 'Inventory Created'
  | 'Inventory Updated'
  | 'Inventory Refreshed'
  | 'Hardware Added'
  | 'Hardware Removed'
  | 'Software Installed'
  | 'Software Removed'
  | 'BIOS Updated'
  | 'Windows Updated'
  | 'Network Changed';

export interface IInventoryRepository {
  /**
   * Upserts the complete device inventory in a transaction.
   * Replaces existing child records and increments inventoryVersion if an existing record is present.
   */
  upsertInventory(
    deviceId: string,
    payload: SubmitInventoryPayload,
    assetFingerprint: string,
  ): Promise<{
    inventory: DeviceInventoryDto;
    previousInventory: DeviceInventoryDto | null;
  }>;

  /**
   * Retrieves the full inventory including all hardware, software, security, and capabilities.
   */
  findCompleteInventory(deviceId: string): Promise<DeviceInventoryDto | null>;

  /**
   * Retrieves strictly hardware components (CPU, Motherboard, BIOS, RAM, Disks, GPUs).
   */
  findHardwareInventory(deviceId: string): Promise<HardwareInventoryResponse | null>;

  /**
   * Retrieves installed software, windows services, and startup applications with search filtering & pagination.
   */
  findSoftwareInventory(
    deviceId: string,
    search?: string,
    page?: number,
    limit?: number,
  ): Promise<SoftwareInventoryResponse | null>;

  /**
   * Retrieves network adapters and routing parameters.
   */
  findNetworkInventory(deviceId: string): Promise<NetworkInventoryResponse | null>;

  /**
   * Retrieves security attributes and system capability evaluations.
   */
  findSecurityInventory(deviceId: string): Promise<SecurityInventoryResponse | null>;

  /**
   * Retrieves diagnostic health statistics for a target node or global averages.
   */
  getInventoryHealth(deviceId?: string): Promise<InventoryHealthResponse>;

  /**
   * Records an immutable audit log entry for inventory events and difference engine findings.
   */
  createAuditLog(
    deviceId: string,
    action: InventoryAuditAction,
    changeDetails: string,
  ): Promise<void>;

  /**
   * Retrieves the most recent audit events for a monitored node.
   */
  getRecentAuditLogs(deviceId: string, limit?: number): Promise<InventoryAuditLogDto[]>;
  search(query: string, organizationId: string): Promise<any[]>;
}
