'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, rawApi } from '../lib/api-client';
import { User, ApiResponse } from '../types/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
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
      const response = await api.get<ApiResponse<User>>('/auth/me');
      setUser(response.data);
    } catch (err) {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nos_access_token');
        localStorage.removeItem('nos_refresh_token');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('nos_access_token') : null;
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await rawApi.post('/auth/login', { email, password });
      const data = res.data.data || res.data;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('nos_access_token', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('nos_refresh_token', data.refreshToken);
        }
      }
      
      // Wait for fetch user before resolving
      await fetchUser();
      
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Login failed'));
      setIsLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await rawApi.post('/auth/logout');
    } catch (err) {
      console.error('Logout API failed', err);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nos_access_token');
        localStorage.removeItem('nos_refresh_token');
        setUser(null);
        window.location.href = '/login';
      }
    }
  };

  const refreshToken = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('nos_refresh_token') : null;
      if (!token) throw new Error('No refresh token');
      
      const res = await rawApi.post('/auth/refresh', { refreshToken: token });
      const data = res.data.data || res.data;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('nos_access_token', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('nos_refresh_token', data.refreshToken);
        }
      }
    } catch (err) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nos_access_token');
        localStorage.removeItem('nos_refresh_token');
        setUser(null);
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
