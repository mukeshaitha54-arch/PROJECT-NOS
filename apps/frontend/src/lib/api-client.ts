import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const resolveBaseUrl = () => {
  if (typeof window !== "undefined") {
    if (
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      return `${window.location.origin}/api/v1`;
    }
    return (
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api/v1"
    );
  }
  return process.env.INTERNAL_BACKEND_URL
    ? `${process.env.INTERNAL_BACKEND_URL}/api/v1`
    : "http://backend:3001/api/v1";
};

export const rawApi = axios.create({
  baseURL: resolveBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Ensure baseURL is always up-to-date on every request (avoids stale module-load value)
rawApi.interceptors.request.use((config) => {
  if (!config.baseURL || config.baseURL.includes(":3001")) {
    config.baseURL = resolveBaseUrl();
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function performTokenRefresh(): Promise<string> {
  const refreshToken =
    typeof window !== "undefined"
      ? localStorage.getItem("nos_refresh_token")
      : null;
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const res = await axios.post(`${resolveBaseUrl()}/auth/refresh`, {
    refreshToken,
  });
  const data = res.data?.data || res.data;
  const newAccessToken = data?.accessToken;
  const newRefreshToken = data?.refreshToken;

  if (typeof window !== "undefined" && newAccessToken) {
    localStorage.setItem("nos_access_token", newAccessToken);
    if (newRefreshToken) {
      localStorage.setItem("nos_refresh_token", newRefreshToken);
    }
  }
  return newAccessToken;
}

rawApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("nos_access_token")
        : null;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const activeOrgId =
      typeof window !== "undefined"
        ? localStorage.getItem("nos_active_org_id")
        : null;
    if (activeOrgId && config.headers && !config.headers["x-organization-id"]) {
      config.headers["x-organization-id"] = activeOrgId;
      config.headers["x-tenant-id"] = activeOrgId;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

rawApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    // Handle 429 Rate Limit with simple exponential backoff
    if (error.response?.status === 429) {
      originalRequest._retryCount = originalRequest._retryCount || 0;
      if (originalRequest._retryCount < 3) {
        originalRequest._retryCount++;
        const backoff = Math.pow(2, originalRequest._retryCount - 1) * 1000;
        console.warn(`Rate limited — retrying in ${backoff}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        return rawApi(originalRequest);
      }
      console.error("Rate limit exceeded max retries");
    }

    if (error.response?.status === 403) {
      console.error("Access denied");
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== "/auth/login" &&
      originalRequest.url !== "/auth/refresh"
    ) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = performTokenRefresh().finally(() => {
            refreshPromise = null;
          });
        }
        const newAccessToken = await refreshPromise;
        if (originalRequest.headers && newAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return rawApi(originalRequest);
      } catch (refreshErr) {
        // Do not force window.location.href here — auth context will handle expired sessions
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  },
);

export const api = {
  get: <T>(url: string, config?: any) =>
    rawApi.get<T>(url, config).then((res) => res.data),
  post: <T>(url: string, data?: any, config?: any) =>
    rawApi.post<T>(url, data, config).then((res) => res.data),
  patch: <T>(url: string, data?: any, config?: any) =>
    rawApi.patch<T>(url, data, config).then((res) => res.data),
  delete: <T>(url: string, config?: any) =>
    rawApi.delete<T>(url, config).then((res) => res.data),
};

export const apiClient = rawApi;
