import { Injectable } from '@nestjs/common';
import { SocketConnectionMetrics, SocketHealthResponse } from '@nos/shared-types';

@Injectable()
export class SocketMetricsService {
  private readonly startTime = Date.now();
  private connectedClientsCount = 0;
  private reconnectCount = 0;
  private disconnectCount = 0;
  private totalSessionDurationMs = 0;
  private droppedEventsCount = 0;
  private authFailuresCount = 0;
  private latestLatencyMs = 2; // Default baseline internal hop latency

  public recordClientConnection(isReconnect = false): void {
    this.connectedClientsCount++;
    if (isReconnect) {
      this.reconnectCount++;
    }
  }

  public recordClientDisconnection(sessionDurationMs: number): void {
    this.connectedClientsCount = Math.max(0, this.connectedClientsCount - 1);
    this.disconnectCount++;
    if (sessionDurationMs > 0) {
      this.totalSessionDurationMs += sessionDurationMs;
    }
  }

  public recordAuthFailure(): void {
    this.authFailuresCount++;
  }

  public recordDroppedEvent(): void {
    this.droppedEventsCount++;
  }

  public updateLatency(latencyMs: number): void {
    if (latencyMs >= 0) {
      // Exponential moving average latency tracking
      this.latestLatencyMs = Math.round((this.latestLatencyMs * 0.7) + (latencyMs * 0.3));
    }
  }

  public getConnectionMetrics(): SocketConnectionMetrics {
    const averageSessionTimeMs = this.disconnectCount > 0
      ? Math.round(this.totalSessionDurationMs / this.disconnectCount)
      : 0;

    return {
      connectedClients: this.connectedClientsCount,
      reconnectCount: this.reconnectCount,
      disconnectCount: this.disconnectCount,
      averageSessionTimeMs,
      totalAuthFailures: this.authFailuresCount,
      droppedEvents: this.droppedEventsCount,
    };
  }

  public buildHealthResponse(totalRooms = 0, namespacesCount = 1): SocketHealthResponse {
    const metrics = this.getConnectionMetrics();
    const memoryUsage = process.memoryUsage().heapUsed;
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      connectedClients: metrics.connectedClients,
      rooms: totalRooms,
      namespaces: namespacesCount,
      reconnectCount: metrics.reconnectCount,
      disconnectCount: metrics.disconnectCount,
      averageSessionTime: Math.floor(metrics.averageSessionTimeMs / 1000),
      droppedEvents: metrics.droppedEvents,
      memoryUsage,
      latency: this.latestLatencyMs,
      gatewayUptime: uptimeSeconds,
      authenticationFailures: metrics.totalAuthFailures,
    };
  }
}
