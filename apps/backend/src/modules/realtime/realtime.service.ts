import { Injectable, Logger } from "@nestjs/common";
import { ApiResponse, SocketHealthResponse } from "@nos/shared-types";
import { SocketMetricsService } from "./services/socket-metrics.service";
import { ConnectionRegistryService } from "./services/connection-registry.service";
import { PresenceService } from "./services/presence.service";

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(
    private readonly metricsService: SocketMetricsService,
    private readonly registryService: ConnectionRegistryService,
    private readonly presenceService: PresenceService,
  ) {}

  async getSocketHealth(
    correlationId?: string,
  ): Promise<ApiResponse<SocketHealthResponse>> {
    this.logger.debug(
      `Evaluating enterprise realtime Socket.IO health telemetry. CorId: [${correlationId || "none"}]`,
    );

    const totalRooms = this.registryService.getTotalActiveRooms();
    const healthData = this.metricsService.buildHealthResponse(totalRooms, 1); // 1 primary namespace (/realtime)

    return {
      success: true,
      data: healthData,
      requestId: correlationId,
      timestamp: new Date().toISOString(),
    };
  }

  async getPresenceOverview(): Promise<any> {
    return {
      onlineUsers: this.presenceService.getOnlineUsersList(),
      onlineDevices: this.presenceService.getOnlineDevicesList(),
      totalActiveSockets: this.registryService.getActiveSessionsCount(),
    };
  }
}
