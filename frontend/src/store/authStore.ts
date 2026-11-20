import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthTokens } from '@mediguard/shared/types';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, tokens: AuthTokens) => void;
  setUser: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  updateProfile: (profile: Partial<User>) => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: true,
      setAuth: (user, tokens) =>
        set({ user, tokens, isAuthenticated: true, isLoading: false }),
      setUser: (user) => set({ user }),
      updateProfile: (profile) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...profile } : null,
        })),
      logout: () =>
        set({ user: null, tokens: null, isAuthenticated: false, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      initializeAuth: async () => {
        try {
          // Short timeout so the loading state is visible and the persist
          // middleware has time to finish hydrating from localStorage.
          await new Promise((resolve) => setTimeout(resolve, 500));

          const state = useAuthStore.getState();
          if (state.tokens && state.user) {
            set({ isAuthenticated: true });
          } else {
            set({ isAuthenticated: false });
          }
        } catch {
          // Session check failed (network / API error) — never leave the
          // user stuck on a spinner; treat as unauthenticated.
          set({ isAuthenticated: false });
        } finally {
          // Always clear the loading flag, even on errors.
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'mediguard-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  React.useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return children;
};
