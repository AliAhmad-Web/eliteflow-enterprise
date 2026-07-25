import { create } from "zustand";

import type { AuthStore } from "../types/auth.types";
import { writeCachedAuthUser } from "../utils/auth-session-cache";

/**
 * Always start empty on server AND the client's first render so hydration
 * matches. Cached user is restored in AuthProvider after mount (useLayoutEffect).
 */
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,

  setSession: (user, accessToken) => {
    writeCachedAuthUser(user);
    set({
      user,
      accessToken,
      isAuthenticated: true,
    });
  },

  setAccessToken: (accessToken) => {
    set({ accessToken });
  },

  setUser: (user) => {
    writeCachedAuthUser(user);
    set({ user, isAuthenticated: true });
  },

  clearSession: () => {
    writeCachedAuthUser(null);
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },

  setInitialized: (value) => {
    set({ isInitialized: value });
  },
}));
