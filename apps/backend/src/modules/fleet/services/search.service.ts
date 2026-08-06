import { Injectable, Inject } from '@nestjs/common';
import { IUserRepositoryToken, IUserRepository } from '../../../common/repositories/user.repository.interface';
import { IDeviceRepositoryToken, IDeviceRepository } from '../../../common/repositories/device.repository.interface';
import { IAlertRepository } from '../../../common/repositories/alert.repository.interface';
import { IInventoryRepository } from '../../../common/repositories/inventory.repository.interface';

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  metadata?: any;
}

@Injectable()
export class SearchService {
  constructor(
    @Inject(IUserRepositoryToken) private readonly userRepo: IUserRepository,
    @Inject(IDeviceRepositoryToken) private readonly deviceRepo: IDeviceRepository,
    @Inject(IAlertRepository) private readonly alertRepo: IAlertRepository,
    @Inject(IInventoryRepository) private readonly inventoryRepo: IInventoryRepository,
  ) {}

  async globalSearch(query: string, organizationId: string): Promise<SearchResult[]> {
    if (!query || query.length < 2) {
      return [];
    }

    // Execute repository searches in parallel
    const [users, devices, alerts, inventories] = await Promise.all([
      this.userRepo.search(query, organizationId).catch(() => []), // Ignoring errors if not fully implemented in some branches
      this.deviceRepo.search(query, organizationId).catch(() => []),
      this.alertRepo.search(query, organizationId).catch(() => []),
      this.inventoryRepo.search(query, organizationId).catch(() => []),
    ]);

    const results: SearchResult[] = [];

    // Format Users
    for (const user of users) {
      results.push({
        type: 'USER',
        id: user.id,
        title: `${user.firstName} ${user.lastName}`,
        subtitle: user.email,
        metadata: { role: user.role }
      });
    }

    // Format Devices
    for (const device of devices) {
      results.push({
        type: 'DEVICE',
        id: device.id,
        title: device.hostname,
        subtitle: device.os,
        metadata: { status: device.status }
      });
    }

    // Format Alerts
    for (const alert of alerts) {
      results.push({
        type: 'ALERT',
        id: alert.id,
        title: alert.title,
        subtitle: alert.incidentNumber,
        metadata: { severity: alert.severity, status: alert.status }
      });
    }

    // Format Inventory
    for (const inv of inventories) {
      results.push({
        type: 'INVENTORY',
        id: inv.id,
        title: `${inv.manufacturer} ${inv.model}`,
        subtitle: inv.serialNumber,
        metadata: { deviceId: inv.deviceId }
      });
    }

    // Sort by type or relevance (simple sort for now)
    return results.sort((a, b) => a.title.localeCompare(b.title));
  }
}
