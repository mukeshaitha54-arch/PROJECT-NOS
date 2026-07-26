import { create } from 'zustand';
import { User, TokenResponsePayload } from '@nos/shared-types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setSession: (session: TokenResponsePayload) => void;
  updateUser: (user: User) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Safe SSR initialization from localStorage
  let initialUser: User | null = null;
  let initialAccess: string | null = null;
  let initialRefresh: string | null = null;

  if (typeof window !== 'undefined') {
    try {
      const storedUser = localStorage.getItem('nos_user');
      initialAccess = localStorage.getItem('nos_access_token');
      initialRefresh = localStorage.getItem('nos_refresh_token');
      if (storedUser) {
        initialUser = JSON.parse(storedUser);
      }
    } catch (err) {
      console.error('Failed to restore authentication state:', err);
    }
  }

  return {
    user: initialUser,
    accessToken: initialAccess,
    refreshToken: initialRefresh,
    isAuthenticated: !!initialAccess && !!initialUser,

    setSession: (session: TokenResponsePayload) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('nos_access_token', session.accessToken);
        localStorage.setItem('nos_refresh_token', session.refreshToken);
        localStorage.setItem('nos_user', JSON.stringify(session.user));
      }
      set({
        user: session.user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        isAuthenticated: true,
      });
    },

    updateUser: (updatedUser: User) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('nos_user', JSON.stringify(updatedUser));
      }
      set({ user: updatedUser });
    },

    clearSession: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nos_access_token');
        localStorage.removeItem('nos_refresh_token');
        localStorage.removeItem('nos_user');
      }
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
    },
  };
});
