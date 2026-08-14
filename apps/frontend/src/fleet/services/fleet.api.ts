import axios from "axios";

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api/v1",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const fleetApi = {
  generateRegistrationKey: (payload: {
    organizationId: string;
    displayName: string;
    maxUses: number;
    expiresAt: string;
  }) => api.post<{ plainKey: string }>("/fleet/registration-keys", payload),

  getRegistrationKeys: (organizationId: string) =>
    api
      .get(`/fleet/registration-keys?organizationId=${organizationId}`)
      .then((r) => r.data),

  revokeRegistrationKey: (keyId: string, reason?: string) =>
    api.delete(`/fleet/registration-keys/${keyId}`, { data: { reason } }),
};
