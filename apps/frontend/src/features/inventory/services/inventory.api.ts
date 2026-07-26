import { apiClient } from '../../../lib/api-client';
import {
  ApiResponse,
  CompleteInventoryResponse,
  HardwareInventoryResponse,
  SoftwareInventoryResponse,
  NetworkInventoryResponse,
  SecurityInventoryResponse,
  InventoryHealthResponse,
} from '@nos/shared-types';

export interface InventoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const inventoryApi = {
  /**
   * Retrieves comprehensive hardware, software, network, security, capability, and audit logs for a target node.
   */
  async getCompleteInventory(deviceId: string): Promise<CompleteInventoryResponse> {
    const res = await apiClient.get<ApiResponse<CompleteInventoryResponse>>(`/api/v1/inventory/${deviceId}`);
    if (!res.data.data) throw new Error('Failed to retrieve complete device inventory.');
    return res.data.data;
  },

  /**
   * Retrieves detailed hardware specifications (RAM slots, Storage Disks, GPUs, Processor topology).
   */
  async getHardware(deviceId: string): Promise<HardwareInventoryResponse> {
    const res = await apiClient.get<ApiResponse<HardwareInventoryResponse>>(`/api/v1/inventory/hardware/${deviceId}`);
    if (!res.data.data) throw new Error('Failed to retrieve hardware inventory specification.');
    return res.data.data;
  },

  /**
   * Retrieves paginated, filterable installed software applications and Windows services.
   */
  async getSoftware(deviceId: string, query?: InventoryQueryParams): Promise<SoftwareInventoryResponse> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', String(query.page));
    if (query?.limit) params.append('limit', String(query.limit));
    if (query?.search && query.search.trim().length > 0) params.append('search', query.search.trim());

    const res = await apiClient.get<ApiResponse<SoftwareInventoryResponse>>(
      `/api/v1/inventory/software/${deviceId}?${params.toString()}`,
    );
    if (!res.data.data) throw new Error('Failed to retrieve software and services inventory.');
    return res.data.data;
  },

  /**
   * Retrieves physical and virtual network adapters, MACs, IPv4/IPv6, gateway, DNS, and speed parameters.
   */
  async getNetwork(deviceId: string): Promise<NetworkInventoryResponse> {
    const res = await apiClient.get<ApiResponse<NetworkInventoryResponse>>(`/api/v1/inventory/network/${deviceId}`);
    if (!res.data.data) throw new Error('Failed to retrieve network adapter inventory.');
    return res.data.data;
  },

  /**
   * Retrieves security posture (Windows Defender, Firewall, BitLocker, SecureBoot, TPM 2.0) and virtualization capabilities.
   */
  async getSecurity(deviceId: string): Promise<SecurityInventoryResponse> {
    const res = await apiClient.get<ApiResponse<SecurityInventoryResponse>>(`/api/v1/inventory/security/${deviceId}`);
    if (!res.data.data) throw new Error('Failed to retrieve security and system capability inventory.');
    return res.data.data;
  },

  /**
   * Retrieves global enterprise inventory health diagnostics and scan freshness compliance.
   */
  async getHealth(): Promise<InventoryHealthResponse> {
    const res = await apiClient.get<ApiResponse<InventoryHealthResponse>>('/api/v1/inventory/health');
    if (!res.data.data) throw new Error('Failed to retrieve enterprise inventory health diagnostics.');
    return res.data.data;
  },

  /**
   * Schedules a manual re-scan command in the control plane for target agent evaluation without direct remote shelling.
   */
  async triggerScan(deviceId: string): Promise<{ deviceId: string; status: string; message: string }> {
    const res = await apiClient.post<ApiResponse<{ deviceId: string; status: string; message: string }>>(
      `/api/v1/inventory/scan/${deviceId}`,
    );
    if (!res.data.data) throw new Error('Failed to schedule manual inventory re-scan.');
    return res.data.data;
  },
};
