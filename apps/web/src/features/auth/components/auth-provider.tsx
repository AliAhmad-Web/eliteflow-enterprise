"use client";

import { useEffect, useLayoutEffect } from "react";

import { getQueryClient } from "@/services/api/query-client";

import { authService } from "../services/auth.service";
import { useAuthStore } from "../stores/auth.store";
import { AUTH_QUERY_KEYS } from "../types/auth.types";
import { readCachedAuthUser } from "../utils/auth-session-cache";
import { bootstrapSession } from "../utils/session-bootstrap";
import { setSessionHintCookie } from "../utils/session-hint";

interface AuthProviderProps {
  children: React.ReactNode;
}

/** Access tokens last 15 minutes — refresh ahead of expiry while the tab is open. */
const SILENT_REFRESH_MS = 10 * 60 * 1000;

/**
 * Instant shell startup:
 * 1. useLayoutEffect — restore cached user + hint + RQ seed before paint
 * 2. Start bootstrap (token refresh) immediately — does not block render
 * 3. Periodic silent refresh after init
 */
export function AuthProvider({ children }: AuthProviderProps) {
  useLayoutEffect(() => {
    const cached = readCachedAuthUser();
    if (cached) {
      const state = useAuthStore.getState();
      if (!state.user) {
        useAuthStore.setState({
          user: cached,
          isAuthenticated: true,
        });
      }
      void setSessionHintCookie();
      try {
        getQueryClient().setQueryData(AUTH_QUERY_KEYS.me, cached);
      } catch {
        // Query client may be unavailable during very early boot — ignore.
      }
    }

    void bootstrapSession();
  }, []);

  useEffect(() => {
    const silentRefresh = async () => {
      if (document.visibilityState === "hidden") return;
      const { accessToken, isInitialized, isAuthenticated } =
        useAuthStore.getState();
      if (!isInitialized || !isAuthenticated || !accessToken) return;

      try {
        const refreshResult = await authService.refresh();
        useAuthStore.getState().setAccessToken(refreshResult.accessToken);
        void setSessionHintCookie();
      } catch {
        // Leave session as-is; next API call will clear if refresh cookie is gone.
      }
    };

    const intervalId = window.setInterval(() => {
      void silentRefresh();
    }, SILENT_REFRESH_MS);

    const onVisible = () => {
      void silentRefresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return children;
}
