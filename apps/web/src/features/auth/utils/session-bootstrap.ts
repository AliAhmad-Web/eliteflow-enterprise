import type { SafeUser } from "@enterprise/shared";

import { refreshAccessToken } from "@/services/api/api-client";
import { getQueryClient } from "@/services/api/query-client";

import { authService } from "../services/auth.service";
import { useAuthStore } from "../stores/auth.store";
import { AUTH_QUERY_KEYS } from "../types/auth.types";
import { applyAuthoritativeAuthUser } from "./apply-authoritative-auth-user";
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

/**
 * Always network-fetch /me after token refresh so portal UI never keeps a
 * stale CLIENT profile against a different access-token identity.
 */
export async function ensureCurrentUser(options?: {
  forceNetwork?: boolean;
}): Promise<SafeUser | null> {
  const queryClient = getQueryClient();
  const forceNetwork = options?.forceNetwork ?? false;

  if (forceNetwork) {
    queryClient.removeQueries({ queryKey: AUTH_QUERY_KEYS.me });
  } else {
    const cached = readCachedAuthUser();
    if (cached && !queryClient.getQueryData(AUTH_QUERY_KEYS.me)) {
      queryClient.setQueryData(AUTH_QUERY_KEYS.me, cached);
    }
  }

  try {
    const user = await queryClient.fetchQuery({
      queryKey: AUTH_QUERY_KEYS.me,
      queryFn: () => authService.getMe(),
      staleTime: forceNetwork ? 0 : 30_000,
    });
    return user;
  } catch {
    return forceNetwork ? null : readCachedAuthUser();
  }
}

/**
 * One bootstrap per page load. Soft navigations never re-run this.
 *
 * Order:
 * 1. Refresh access token (response now includes authoritative user when available)
 * 2. Mark initialized
 * 3. Force network /me when refresh did not include user
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
        if (useAuthStore.getState().accessToken !== accessToken) {
          useAuthStore.getState().setAccessToken(accessToken);
        }
        void setSessionHintCookie();
        useAuthStore.getState().setInitialized(true);

        // Refresh may already have applied user; still force /me to reconcile
        // any tab that still holds a mismatched local cache.
        const user = await ensureCurrentUser({ forceNetwork: true });
        if (user && accessToken) {
          applyAuthoritativeAuthUser(user, accessToken);
        }
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
