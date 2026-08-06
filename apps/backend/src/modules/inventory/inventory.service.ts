import {
  Injectable,
  Inject,
  Logger,
  ServiceUnavailableException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IInventoryRepository,
} from '../../common/repositories/inventory.repository.interface';
import { InventoryCacheService } from './services/inventory-cache.service';
import { InventoryAuditService } from './services/inventory-audit.service';
import {
  SubmitInventoryPayload,
  CompleteInventoryResponse,
  HardwareInventoryResponse,
  SoftwareInventoryResponse,
  NetworkInventoryResponse,
  SecurityInventoryResponse,
  InventoryHealthResponse,
} from '@nos/shared-types';
import { InventoryQueryDto } from './dto/inventory.dto';
import { PrismaService } from '../../database/prisma.service';
import { InventoryUpdatedEvent } from '../../common/events/domain-events';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @Inject(IInventoryRepository)
    private readonly repository: IInventoryRepository,
    private readonly cache: InventoryCacheService,
    private readonly audit: InventoryAuditService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private checkFeatureFlag(): void {
    if (process.env.FEATURE_INVENTORY_ENABLED === 'false') {
      this.logger.warn('Inventory engine invoked while FEATURE_INVENTORY_ENABLED=false');
      throw new ServiceUnavailableException(
        'Device Inventory & Asset Discovery Engine is currently disabled by enterprise feature flags.',
      );
    }
  }

  async submitInventory(
    payload: SubmitInventoryPayload,
    authenticatedDeviceId?: string,
  ): Promise<CompleteInventoryResponse> {
    this.checkFeatureFlag();

    const targetDeviceId = authenticatedDeviceId || payload.deviceId;
    if (!targetDeviceId) {
      throw new NotFoundException('Target device ID is required to register system inventory.');
    }

    // 1. Generate SHA-256 asset fingerprint
    const fingerprint = this.audit.calculateAssetFingerprint(payload);

    // 2. Perform transactional upsert & child table replacement
    const { inventory, previousInventory } = await this.repository.upsertInventory(
      targetDeviceId,
      payload,
      fingerprint,
    );

    // 3. Execute difference engine & persist audit logs
    const diffResult = await this.audit.detectAndLogDifferences(targetDeviceId, previousInventory, payload, this.repository);

    // 4. Invalidate all read caches for this device
    this.cache.invalidate(`inv:${targetDeviceId}`);

    // 5. Fetch updated audit logs
    const recentAuditLogs = await this.repository.getRecentAuditLogs(targetDeviceId);

    // 6. Emit domain event — timeline and realtime handlers subscribe independently
    // Replaces direct socketPublisher.emitInventoryUpdated() call per Constitutional §8.6
    const device = await this.prisma.device.findUnique({ where: { id: targetDeviceId }, select: { organizationId: true } });
    this.eventEmitter.emit(
      'inventory.updated',
      new InventoryUpdatedEvent(
        device?.organizationId || 'default-org',
        targetDeviceId,
        inventory.inventoryVersion || 1,
        fingerprint,
        diffResult !== null && diffResult !== undefined,
        typeof diffResult === 'string' ? diffResult : `Inventory version ${inventory.inventoryVersion || 1} recorded.`,
      ),
    );

    return {
      inventory,
      recentAuditLogs,
    };
  }

  async getCompleteInventory(deviceId: string): Promise<CompleteInventoryResponse> {
    this.checkFeatureFlag();

    const cacheKey = `inv:${deviceId}:complete`;
    const cached = this.cache.get<CompleteInventoryResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const inventory = await this.repository.findCompleteInventory(deviceId);
    if (!inventory) {
      throw new NotFoundException(`No hardware or asset inventory discovered for device ${deviceId}`);
    }

    const recentAuditLogs = await this.repository.getRecentAuditLogs(deviceId);
    const response: CompleteInventoryResponse = { inventory, recentAuditLogs };

    this.cache.set(cacheKey, response);
    return response;
  }

  async getHardwareInventory(deviceId: string): Promise<HardwareInventoryResponse> {
    this.checkFeatureFlag();

    const cacheKey = `inv:${deviceId}:hw`;
    const cached = this.cache.get<HardwareInventoryResponse>(cacheKey);
    if (cached) return cached;

    const hw = await this.repository.findHardwareInventory(deviceId);
    if (!hw) {
      throw new NotFoundException(`Hardware asset inventory not found for device ${deviceId}`);
    }

    this.cache.set(cacheKey, hw);
    return hw;
  }

  async getSoftwareInventory(
    deviceId: string,
    query: InventoryQueryDto,
  ): Promise<SoftwareInventoryResponse> {
    this.checkFeatureFlag();

    const cacheKey = `inv:${deviceId}:sw:${query.search || 'all'}:p${query.page}:l${query.limit}`;
    const cached = this.cache.get<SoftwareInventoryResponse>(cacheKey);
    if (cached) return cached;

    const sw = await this.repository.findSoftwareInventory(
      deviceId,
      query.search,
      query.page,
      query.limit,
    );
    if (!sw) {
      throw new NotFoundException(`Software inventory not found for device ${deviceId}`);
    }

    this.cache.set(cacheKey, sw, 60000); // 1 minute TTL for paginated queries
    return sw;
  }

  async getNetworkInventory(deviceId: string): Promise<NetworkInventoryResponse> {
    this.checkFeatureFlag();

    const cacheKey = `inv:${deviceId}:net`;
    const cached = this.cache.get<NetworkInventoryResponse>(cacheKey);
    if (cached) return cached;

    const net = await this.repository.findNetworkInventory(deviceId);
    if (!net) {
      throw new NotFoundException(`Network adapter inventory not found for device ${deviceId}`);
    }

    this.cache.set(cacheKey, net);
    return net;
  }

  async getSecurityInventory(deviceId: string): Promise<SecurityInventoryResponse> {
    this.checkFeatureFlag();

    const cacheKey = `inv:${deviceId}:sec`;
    const cached = this.cache.get<SecurityInventoryResponse>(cacheKey);
    if (cached) return cached;

    const sec = await this.repository.findSecurityInventory(deviceId);
    if (!sec) {
      throw new NotFoundException(`Security compliance inventory not found for device ${deviceId}`);
    }

    this.cache.set(cacheKey, sec);
    return sec;
  }

  async getHealthDiagnostics(deviceId?: string): Promise<InventoryHealthResponse> {
    this.checkFeatureFlag();

    return this.repository.getInventoryHealth(deviceId);
  }

  async triggerManualScan(deviceId: string): Promise<{ deviceId: string; status: string; message: string }> {
    this.checkFeatureFlag();

    // Verify inventory or device existence
    const existing = await this.repository.findCompleteInventory(deviceId);
    if (!existing) {
      throw new NotFoundException(`Target node ${deviceId} is not registered in asset repository.`);
    }

    await this.repository.createAuditLog(
      deviceId,
      'Inventory Refreshed',
      'Manual diagnostic inventory re-scan triggered from enterprise control plane.',
    );

    // Invalidate caches so audit log reflects trigger
    this.cache.invalidate(`inv:${deviceId}`);

    return {
      deviceId,
      status: 'SCHEDULED',
      message: 'Manual inventory scan command triggered. The monitoring agent will consume and execute on its next autonomous lifecycle polling cycle.',
    };
  }

  async searchInventory(query: string, tab: string) {
    this.checkFeatureFlag();
    if (tab === 'SOFTWARE') {
      const items = await this.prisma.installedSoftware.findMany({
        where: query ? { name: { contains: query, mode: 'insensitive' } } : {},
        take: 50,
        include: { deviceInventory: { include: { device: true } } }
      });
      return items.map(i => ({
        id: i.id,
        deviceId: i.deviceInventory?.deviceId,
        hostname: i.deviceInventory?.device?.hostname,
        softwareName: i.name,
        publisher: i.publisher,
        version: i.version,
        installDate: i.installDate,
        osEdition: i.deviceInventory?.device?.os || 'Unknown'
      }));
    } else if (tab === 'SERVICES') {
      const items = await this.prisma.windowsService.findMany({
        where: query ? { serviceName: { contains: query, mode: 'insensitive' } } : {},
        take: 50,
        include: { deviceInventory: { include: { device: true } } }
      });
      return items.map(i => ({
        id: i.id,
        deviceId: i.deviceInventory?.deviceId,
        hostname: i.deviceInventory?.device?.hostname,
        serviceName: i.serviceName,
        displayName: i.displayName,
        status: i.status,
        startType: i.startType,
        osEdition: i.deviceInventory?.device?.os || 'Unknown'
      }));
    } else if (tab === 'SECURITY') {
      const devices = await this.prisma.device.findMany({
        where: query ? { hostname: { contains: query, mode: 'insensitive' } } : {},
        take: 50,
        include: { inventory: { include: { security: true } } }
      });
      return devices.filter(d => d.inventory?.security).map(d => ({
        id: d.inventory!.security!.id,
        deviceId: d.id,
        hostname: d.hostname,
        defenderEnabled: d.inventory!.security!.windowsDefenderEnabled,
        firewallEnabled: d.inventory!.security!.firewallEnabled,
        bitLockerStatus: d.inventory!.security!.bitLockerEnabled ? 'Enabled' : 'Disabled',
        tpmVersion: d.inventory!.security!.tpmVersion,
        osEdition: d.os
      }));
    } else if (tab === 'CHANGES') {
      const items = await this.prisma.inventoryAuditLog.findMany({
        where: query ? { changeDetails: { contains: query, mode: 'insensitive' } } : {},
        take: 50,
        include: { device: true }
      });
      return items.map(i => ({
        id: i.id,
        deviceId: i.deviceId,
        hostname: i.device?.hostname,
        action: i.action,
        details: i.changeDetails,
        timestamp: i.timestamp,
        osEdition: i.device?.os || 'Unknown'
      }));
    }
    return [];
  }
}
