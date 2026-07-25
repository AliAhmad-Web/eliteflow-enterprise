import type { SafeUser } from "@enterprise/shared";

import { refreshAccessToken } from "@/services/api/api-client";
import { getQueryClient } from "@/services/api/query-client";

import { authService } from "../services/auth.service";
import { useAuthStore } from "../stores/auth.store";
import { AUTH_QUERY_KEYS } from "../types/auth.types";
import { readCachedAuthUser } from "./auth-session-cache";
import {
  getSessionBootstrapPromise,
  setSessionBootstrapPromise,
} from "./session-bootstrap-mutex";
import {
  clearSessionHintCookie,
  setSessionHintCookie,
} from "./session-hint";

export { resetSessionBootstrap } from "./session-bootstrap-mutex";

/** Treat cached /me as fresh for this window (RC#2). */
const ME_STALE_TIME_MS = 5 * 60 * 1000;
/** Soft background revalidate if cache older than this. */
const ME_BACKGROUND_REVALIDATE_MS = 60 * 1000;

/**
 * Single-flight /me via React Query — duplicate callers share one request.
 * Seeds from localStorage so the shell never waits on the network for profile.
 */
export async function ensureCurrentUser(): Promise<SafeUser | null> {
  const queryClient = getQueryClient();
  const cached = readCachedAuthUser();
  if (cached) {
    queryClient.setQueryData(AUTH_QUERY_KEYS.me, cached);
  }

  try {
    const user = await queryClient.ensureQueryData({
      queryKey: AUTH_QUERY_KEYS.me,
      queryFn: () => authService.getMe(),
      staleTime: ME_STALE_TIME_MS,
    });

    // Soft background revalidate when cache is aging — never blocks shell.
    const state = queryClient.getQueryState(AUTH_QUERY_KEYS.me);
    const age = state?.dataUpdatedAt
      ? Date.now() - state.dataUpdatedAt
      : Number.POSITIVE_INFINITY;
    if (age > ME_BACKGROUND_REVALIDATE_MS) {
      void queryClient.prefetchQuery({
        queryKey: AUTH_QUERY_KEYS.me,
        queryFn: () => authService.getMe(),
        staleTime: ME_STALE_TIME_MS,
      });
    }

    return user;
  } catch {
    return cached;
  }
}

/**
 * One bootstrap per page load. Soft navigations never re-run this.
 *
 * Order (Slack/Notion-style):
 * 1. Refresh access token (or join in-flight refresh)
 * 2. Mark initialized immediately — shell already visible
 * 3. Sync /me without forcing a network hit when cache is fresh
 */
export function bootstrapSession(): Promise<void> {
  const existing = getSessionBootstrapPromise();
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      const accessToken = await refreshAccessToken();
      if (accessToken) {
        // refreshAccessToken already wrote the token — avoid duplicate store update (RC#9).
        if (useAuthStore.getState().accessToken !== accessToken) {
          useAuthStore.getState().setAccessToken(accessToken);
        }
        setSessionHintCookie();
        useAuthStore.getState().setInitialized(true);
        void ensureCurrentUser();
        return;
      }

      const state = useAuthStore.getState();
      if (!state.isAuthenticated && !state.user && !readCachedAuthUser()) {
        clearSessionHintCookie();
      }
    } catch {
      const state = useAuthStore.getState();
      if (!state.accessToken && !state.user && !readCachedAuthUser()) {
        useAuthStore.getState().clearSession();
        clearSessionHintCookie();
      }
    } finally {
      if (!useAuthStore.getState().isInitialized) {
        useAuthStore.getState().setInitialized(true);
      }
    }
  })();

  setSessionBootstrapPromise(promise);
  return promise;
}

export function awaitSessionBootstrap(): Promise<void> {
  return bootstrapSession();
}
