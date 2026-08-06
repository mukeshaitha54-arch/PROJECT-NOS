import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../features/auth/stores/auth.store';
import { ApiResponse, TokenResponsePayload } from '@nos/shared-types';
import { clientEnv } from '../config/env';

const BASE_URL = clientEnv.apiBaseUrl;

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach JWT Bearer Token & Normalize URL
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (config.url && config.url.startsWith('/api/v1/')) {
      config.url = config.url.substring(7);
    }
    const { accessToken, user } = useAuthStore.getState();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    if (user?.organizationId && config.headers) {
      config.headers['x-organization-id'] = user.organizationId;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Automatic Refresh Token Rotation on 401 Unauthorized
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Avoid infinite loop if refresh request fails or isn't 401
    if (!error.response || error.response.status !== 401 || originalRequest.url?.includes('/auth/refresh') || originalRequest._retry) {
      return Promise.reject(error.response?.data?.error || { code: 'NETWORK_ERROR', message: error.message });
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          },
          reject: (err: any) => reject(err),
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const currentRefreshToken = useAuthStore.getState().refreshToken;
    if (!currentRefreshToken) {
      useAuthStore.getState().clearSession();
      return Promise.reject({ code: 'UNAUTHORIZED', message: 'No active refresh session.' });
    }

    try {
      const response = await axios.post<ApiResponse<TokenResponsePayload>>(`${BASE_URL}/auth/refresh`, {
        refreshToken: currentRefreshToken,
      });

      if (response.data.success && response.data.data) {
        const newSession = response.data.data;
        useAuthStore.getState().setSession(newSession);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newSession.accessToken}`;
        }

        processQueue(null, newSession.accessToken);
        return apiClient(originalRequest);
      } else {
        throw new Error('Refresh token rotation rejected by server.');
      }
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      useAuthStore.getState().clearSession();
      return Promise.reject({ code: 'SESSION_EXPIRED', message: 'Session expired. Please log in again.' });
    } finally {
      isRefreshing = false;
    }
  },
);
