import { apiClient } from '../../../lib/api-client';
import {
  ApiResponse,
  DeviceStatusResponse,
  RegisterDevicePayload,
  RegisterDeviceResponse,
  HeartbeatPayload,
  HeartbeatResponse,
  Device,
  Heartbeat,
  TelemetrySnapshot,
  TelemetryHistoryQuery,
  PaginatedTelemetryResponse,
} from '@nos/shared-types';

export const deviceApi = {
  /**
   * Fetches real-time platform device roster and heartbeat statuses.
   */
  async getStatus(): Promise<DeviceStatusResponse> {
    const res = await apiClient.get<ApiResponse<DeviceStatusResponse>>('/api/v1/device/status');
    if (!res.data.data) throw new Error('Failed to parse device status response payload.');
    return res.data.data;
  },

  /**
   * Retrieves specific machine enrollment profile and latest operational heartbeat by primary DB UUID.
   */
  async getById(id: string): Promise<Device & { lastHeartbeat?: Heartbeat | null }> {
    const res = await apiClient.get<ApiResponse<Device & { lastHeartbeat?: Heartbeat | null }>>(`/api/v1/device/${id}`);
    if (!res.data.data) throw new Error('Failed to retrieve target device identity profile.');
    return res.data.data;
  },

  /**
   * Registers a monitoring agent manually or via provisioning portal.
   */
  async register(payload: RegisterDevicePayload): Promise<RegisterDeviceResponse> {
    const res = await apiClient.post<ApiResponse<RegisterDeviceResponse>>('/api/v1/device/register', payload);
    if (!res.data.data) throw new Error('Failed to complete agent onboarding registration.');
    return res.data.data;
  },

  /**
   * Submits diagnostic heartbeat metrics for testing or manual ping.
   */
  async sendHeartbeat(payload: HeartbeatPayload, token: string): Promise<HeartbeatResponse> {
    const res = await apiClient.post<ApiResponse<HeartbeatResponse>>('/api/v1/device/heartbeat', payload, {
      headers: { 'X-Device-Token': token },
    });
    if (!res.data.data) throw new Error('Heartbeat transmission rejected by server.');
    return res.data.data;
  },

  /**
   * Retrieves latest hardware telemetry snapshot recorded for target device.
   */
  async getLatestTelemetry(deviceId: string): Promise<TelemetrySnapshot | null> {
    try {
      const res = await apiClient.get<ApiResponse<TelemetrySnapshot>>(`/api/v1/telemetry/latest/${deviceId}`);
      return res.data.data || null;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  /**
   * Retrieves paginated historical telemetry dataset for time-series analysis and diagnostics.
   */
  async getTelemetryHistory(deviceId: string, query?: TelemetryHistoryQuery): Promise<PaginatedTelemetryResponse> {
    const params = new URLSearchParams();
    if (query?.from) params.append('from', query.from);
    if (query?.to) params.append('to', query.to);
    if (query?.limit) params.append('limit', String(query.limit));
    if (query?.page) params.append('page', String(query.page));

    const res = await apiClient.get<ApiResponse<any> & PaginatedTelemetryResponse>(`/api/v1/telemetry/history/${deviceId}?${params.toString()}`);
    return {
      snapshots: res.data.snapshots || [],
      total: res.data.total || 0,
      page: res.data.page || 1,
      limit: res.data.limit || 50,
      totalPages: res.data.totalPages || 1,
    };
  },
};
