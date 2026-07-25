import type { SafeUser } from "@enterprise/shared";

const AUTH_USER_CACHE_KEY = "eliteflow-auth-user";

export function readCachedAuthUser(): SafeUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_USER_CACHE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as SafeUser;
  } catch {
    return null;
  }
}

export function writeCachedAuthUser(user: SafeUser | null): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (!user) {
      window.localStorage.removeItem(AUTH_USER_CACHE_KEY);
      return;
    }
    window.localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    // Ignore quota / private-mode failures — in-memory session still works.
  }
}
