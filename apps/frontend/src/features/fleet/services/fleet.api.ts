import { apiClient } from "../../../lib/api-client";
import { ApiResponse } from "@nos/shared-types";

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  metadata?: any;
}

export const fleetApi = {
  /**
   * Perform global search across users, devices, alerts, and inventory
   */
  async globalSearch(orgId: string, query: string): Promise<SearchResult[]> {
    if (!query || query.length < 2) return [];
    const params = new URLSearchParams({ q: query });
    const res = await apiClient.get<any, ApiResponse<SearchResult[]>>(
      `/fleet/search/${orgId}?${params.toString()}`,
    );
    return res.data || [];
  },

  /**
   * Fetch the organizational hierarchy tree
   */
  async getHierarchy(orgId: string): Promise<any> {
    const res = await apiClient.get<any, ApiResponse<any>>(
      `/fleet/hierarchy/${orgId}`,
    );
    return res.data || null;
  },

  /**
   * Registration Keys
   */
  async getRegistrationKeys(orgId: string): Promise<any[]> {
    const res = await apiClient.get<any, ApiResponse<any[]>>(
      `/fleet/registration-keys/organization/${orgId}`,
    );
    return res.data || [];
  },

  async generateRegistrationKey(data: any): Promise<any> {
    const res = await apiClient.post<any, ApiResponse<any>>(
      "/fleet/registration-keys",
      data,
    );
    return res.data;
  },

  async revokeRegistrationKey(id: string, reason: string): Promise<any> {
    const res = await apiClient.post<any, ApiResponse<any>>(
      `/fleet/registration-keys/${id}/revoke`,
      { reason },
    );
    return res.data;
  },
};
