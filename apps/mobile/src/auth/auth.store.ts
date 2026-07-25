import { create } from "zustand";
import type { SafeUser } from "@enterprise/shared";

import { secureTokenStorage } from "./secure-token-storage";

interface AuthStore {
  user: SafeUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  setSession: (user: SafeUser, accessToken: string) => Promise<void>;
  setAccessToken: (accessToken: string) => Promise<void>;
  setUser: (user: SafeUser) => Promise<void>;
  clearSession: () => Promise<void>;
  setInitialized: (value: boolean) => void;
  hydrateFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,

  setSession: async (user, accessToken) => {
    await secureTokenStorage.saveAccessToken(accessToken);
    await secureTokenStorage.saveCachedUser(JSON.stringify(user));
    set({
      user,
      accessToken,
      isAuthenticated: true,
    });
  },

  setAccessToken: async (accessToken) => {
    await secureTokenStorage.saveAccessToken(accessToken);
    set({ accessToken });
  },

  setUser: async (user) => {
    await secureTokenStorage.saveCachedUser(JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  clearSession: async () => {
    await secureTokenStorage.clearAll();
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },

  setInitialized: (value) => {
    set({ isInitialized: value });
  },

  hydrateFromStorage: async () => {
    const [accessToken, cachedUserJson] = await Promise.all([
      secureTokenStorage.getAccessToken(),
      secureTokenStorage.getCachedUser(),
    ]);

    let user: SafeUser | null = null;
    if (cachedUserJson) {
      try {
        user = JSON.parse(cachedUserJson) as SafeUser;
      } catch {
        user = null;
      }
    }

    if (accessToken && user) {
      set({
        accessToken,
        user,
        isAuthenticated: true,
      });
    } else if (accessToken) {
      set({ accessToken });
    }
  },
}));
