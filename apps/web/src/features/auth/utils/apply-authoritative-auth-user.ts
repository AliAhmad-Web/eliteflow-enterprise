import type { SafeUser } from "@enterprise/shared";
import { UserRole } from "@enterprise/shared";

import { getQueryClient, clearPersistedQueryCache } from "@/services/api/query-client";
import { ROUTES } from "@/constants/routes";

import { useAuthStore } from "../stores/auth.store";
import { AUTH_QUERY_KEYS } from "../types/auth.types";
import { writeCachedAuthUser } from "./auth-session-cache";
import { clearSessionHintCookie } from "./session-hint";
import { resetSessionBootstrap } from "./session-bootstrap-mutex";

/**
 * Apply the server-authoritative user for the current access token.
 * Clears query caches when the authenticated identity/role changes so portal
 * pages never keep a CLIENT shell against an ADMIN token (or vice versa).
 */
export function applyAuthoritativeAuthUser(
  user: SafeUser,
  accessToken: string,
): void {
  const previous = useAuthStore.getState().user;
  const identityChanged =
    !previous ||
    previous.id !== user.id ||
    previous.role.code !== user.role.code;

  useAuthStore.getState().setSession(user, accessToken);

  try {
    const queryClient = getQueryClient();
    queryClient.setQueryData(AUTH_QUERY_KEYS.me, user);
    if (identityChanged) {
      queryClient.removeQueries({
        predicate: (query) => {
          const root = query.queryKey[0];
          return root !== "auth";
        },
      });
      clearPersistedQueryCache();
    }
  } catch {
    // Query client may be unavailable during early boot.
  }
}

/** Full local auth wipe used when CLIENT UI is paired with a privileged token. */
export function forceClientAuthReset(reason: string): void {
  try {
    sessionStorage.setItem(
      "eliteflow-auth-reset-reason",
      reason.slice(0, 280),
    );
  } catch {
    // ignore
  }

  useAuthStore.getState().clearSession();
  writeCachedAuthUser(null);
  clearSessionHintCookie();
  resetSessionBootstrap();
  clearPersistedQueryCache();
  try {
    getQueryClient().clear();
  } catch {
    // ignore
  }

  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    if (!path.startsWith("/login") && !path.startsWith("/auth/")) {
      window.location.assign(`${ROUTES.LOGIN}?sessionReset=1`);
    }
  }
}

export function isClientRole(roleCode: string | undefined | null): boolean {
  return String(roleCode ?? "").toUpperCase() === UserRole.CLIENT;
}

export function isPrivilegedRole(roleCode: string | undefined | null): boolean {
  const normalized = String(roleCode ?? "").toUpperCase();
  return (
    normalized === UserRole.ADMIN || normalized === UserRole.SUPER_ADMIN
  );
}
