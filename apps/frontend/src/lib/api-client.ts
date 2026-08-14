import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const rawApi = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

rawApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("nos_access_token")
        : null;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
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
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return rawApi(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken =
          typeof window !== "undefined"
            ? localStorage.getItem("nos_refresh_token")
            : null;
        if (!refreshToken) throw new Error("No refresh token");

        // Use a new axios instance to avoid interceptor loops
        const refreshResponse = await axios.post("/api/v1/auth/refresh", {
          refreshToken,
        });
        const { accessToken, refreshToken: newRefreshToken } =
          refreshResponse.data.data || refreshResponse.data;

        if (typeof window !== "undefined") {
          localStorage.setItem("nos_access_token", accessToken);
          if (newRefreshToken)
            localStorage.setItem("nos_refresh_token", newRefreshToken);
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        processQueue(null, accessToken);

        return rawApi(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("nos_access_token");
          localStorage.removeItem("nos_refresh_token");
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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
