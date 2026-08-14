import { Injectable, Inject, Logger } from "@nestjs/common";
import {
  IMaintenanceRepository,
  MaintenanceWindowCreateInput,
} from "../../../common/repositories/maintenance.repository.interface";
import { MaintenanceWindow } from "@prisma/client";

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @Inject(IMaintenanceRepository)
    private readonly maintenanceRepo: IMaintenanceRepository,
  ) {}

  async createWindow(
    input: MaintenanceWindowCreateInput,
  ): Promise<MaintenanceWindow> {
    this.logger.log(
      `[Maintenance] Scheduled window "${input.title}" from ${input.startTime} to ${input.endTime} (${input.type || "SCHEDULED"})`,
    );
    return this.maintenanceRepo.create(input);
  }

  async isDeviceInMaintenance(
    deviceId: string,
    atTime = new Date(),
  ): Promise<{ inMaintenance: boolean; activeWindow?: MaintenanceWindow }> {
    const windows = await this.maintenanceRepo.findActiveByDevice(
      deviceId,
      atTime,
    );
    if (windows && windows.length > 0) {
      return { inMaintenance: true, activeWindow: windows[0] };
    }
    return { inMaintenance: false };
  }

  async getWindows(enabledOnly = false): Promise<MaintenanceWindow[]> {
    return this.maintenanceRepo.findMany(enabledOnly);
  }

  async getById(id: string): Promise<MaintenanceWindow | null> {
    return this.maintenanceRepo.findById(id);
  }

  async updateWindow(
    id: string,
    data: Partial<MaintenanceWindow>,
  ): Promise<MaintenanceWindow> {
    return this.maintenanceRepo.update(id, data);
  }

  async deleteWindow(id: string): Promise<boolean> {
    return this.maintenanceRepo.delete(id);
  }
}
