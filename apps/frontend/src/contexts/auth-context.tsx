"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { api, rawApi } from "../lib/api-client";
import { User, ApiResponse } from "../types/api";

interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  login: (
    emailOrCredentials: string | { email: string; password: string },
    password?: string,
  ) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get<any>("/auth/me");
      const userData = response.data?.data || response.data;
      if (userData) {
        setUser(userData);
        if (typeof window !== "undefined") {
          localStorage.setItem("nos_cached_user", JSON.stringify(userData));
          if (
            userData.organizationId &&
            !localStorage.getItem("nos_active_org_id")
          ) {
            localStorage.setItem("nos_active_org_id", userData.organizationId);
          }
        }
      }
    } catch (err: any) {
      console.warn("Session check (/auth/me) error:", err?.message || err);
      // ONLY clear credentials and log out if the backend explicitly rejected the token with 401
      if (err?.response?.status === 401) {
        setUser(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("nos_access_token");
          localStorage.removeItem("nos_refresh_token");
          localStorage.removeItem("nos_cached_user");
          localStorage.removeItem("nos_active_org_id");
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("nos_access_token")
        : null;
    if (token) {
      const cached =
        typeof window !== "undefined"
          ? localStorage.getItem("nos_cached_user")
          : null;
      if (cached) {
        try {
          setUser(JSON.parse(cached));
          setIsLoading(false);
        } catch {}
      }
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  const login = async (
    emailOrCredentials: string | { email: string; password: string },
    passwordArg?: string,
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      const email =
        typeof emailOrCredentials === "string"
          ? emailOrCredentials
          : emailOrCredentials.email;
      const password =
        typeof emailOrCredentials === "string"
          ? passwordArg
          : emailOrCredentials.password;

      const res = await rawApi.post("/auth/login", { email, password });
      const data = res.data?.data || res.data;

      if (typeof window !== "undefined" && data?.accessToken) {
        localStorage.setItem("nos_access_token", data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem("nos_refresh_token", data.refreshToken);
        }
      }

      if (data?.user) {
        setUser(data.user);
        if (typeof window !== "undefined") {
          localStorage.setItem("nos_cached_user", JSON.stringify(data.user));
        }
      } else {
        await fetchUser();
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Login failed"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    try {
      setIsLoading(true);
      setError(null);
      await rawApi.post("/auth/register", payload);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Registration failed"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await rawApi.post("/auth/logout");
    } catch (err) {
      console.error("Logout API failed", err);
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("nos_access_token");
        localStorage.removeItem("nos_refresh_token");
        localStorage.removeItem("nos_cached_user");
        localStorage.removeItem("nos_active_org_id");
        setUser(null);
        // Use replace to avoid adding /auth/login to the browser history stack
        window.location.replace("/auth/login");
      }
    }
  };

  const refreshToken = async () => {
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("nos_refresh_token")
          : null;
      if (!token) throw new Error("No refresh token");

      const res = await rawApi.post("/auth/refresh", { refreshToken: token });
      const data = res.data.data || res.data;

      if (typeof window !== "undefined") {
        localStorage.setItem("nos_access_token", data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem("nos_refresh_token", data.refreshToken);
        }
      }
    } catch (err: any) {
      if (typeof window !== "undefined") {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem("nos_access_token");
          localStorage.removeItem("nos_refresh_token");
          localStorage.removeItem("nos_cached_user");
          setUser(null);
        }
      }
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        login,
        register,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
