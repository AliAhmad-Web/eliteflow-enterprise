"use client";

import { useAuthStore } from "../stores/auth.store";

/**
 * Auth snapshot for UI. Does NOT subscribe to accessToken so silent refresh
 * and bootstrap token writes do not re-render the shell (RC#9).
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  return {
    user,
    isAuthenticated,
    isInitialized,
    /** Sync read — not a store subscription. */
    get accessToken() {
      return useAuthStore.getState().accessToken;
    },
  };
}
