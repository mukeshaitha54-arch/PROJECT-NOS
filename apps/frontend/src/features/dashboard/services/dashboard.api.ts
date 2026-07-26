import { apiClient } from '../../../lib/api-client';
import {
  ApiResponse,
  DashboardOverviewResponse,
  DashboardDevicesQuery,
  PaginatedDashboardDevicesResponse,
  DashboardDeviceDetailResponse,
  DashboardHistoryQuery,
  PaginatedTelemetryResponse,
} from '@nos/shared-types';

export const dashboardApi = {
  /**
   * Fetches operational infrastructure overview counts (Total, Online, Offline, Critical, Warning).
   */
  async getOverview(): Promise<DashboardOverviewResponse> {
    const res = await apiClient.get<ApiResponse<DashboardOverviewResponse>>('/api/v1/dashboard/overview');
    if (!res.data.data) throw new Error('Failed to retrieve dashboard overview counts.');
    return res.data.data;
  },

  /**
   * Fetches paginated, searchable, and filterable device operational monitoring table rows.
   */
  async getDevices(query?: DashboardDevicesQuery): Promise<PaginatedDashboardDevicesResponse> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', String(query.page));
    if (query?.limit) params.append('limit', String(query.limit));
    if (query?.search && query.search.trim().length > 0) params.append('search', query.search.trim());
    if (query?.status && query.status !== 'ALL') params.append('status', query.status);
    if (query?.os && query.os !== 'ALL') params.append('os', query.os);

    const res = await apiClient.get<ApiResponse<PaginatedDashboardDevicesResponse>>(`/api/v1/dashboard/devices?${params.toString()}`);
    if (!res.data.data) throw new Error('Failed to retrieve dashboard device rows.');
    return res.data.data;
  },

  /**
   * Retrieves comprehensive device real-time monitoring details (Current Snapshot, Heartbeat, CPU, RAM, Disk, Network, System Status).
   */
  async getDeviceDetail(id: string): Promise<DashboardDeviceDetailResponse> {
    const res = await apiClient.get<ApiResponse<DashboardDeviceDetailResponse>>(`/api/v1/dashboard/device/${id}`);
    if (!res.data.data) throw new Error('Failed to retrieve target device operational detail profile.');
    return res.data.data;
  },

  /**
   * Retrieves paginated historical time-series telemetry snapshots filtered by custom time ranges (No Charts).
   */
  async getDeviceHistory(deviceId: string, query?: DashboardHistoryQuery): Promise<PaginatedTelemetryResponse> {
    const params = new URLSearchParams();
    if (query?.from) params.append('from', query.from);
    if (query?.to) params.append('to', query.to);
    if (query?.limit) params.append('limit', String(query.limit));
    if (query?.page) params.append('page', String(query.page));

    const res = await apiClient.get<ApiResponse<PaginatedTelemetryResponse>>(`/api/v1/dashboard/history/${deviceId}?${params.toString()}`);
    if (!res.data.data) throw new Error('Failed to retrieve historical telemetry records.');
    return res.data.data;
  },
};
