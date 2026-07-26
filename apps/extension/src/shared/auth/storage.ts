import type { SafeUser } from "@enterprise/shared";

import { STORAGE_KEYS } from "../config";

export type PendingSavePage = {
  title: string;
  url: string;
};

export type ExtensionSession = {
  accessToken: string | null;
  refreshToken: string | null;
  user: SafeUser | null;
};

function getLocal<T>(key: string): Promise<T | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      const value = result[key];
      resolve((value as T | undefined) ?? null);
    });
  });
}

function setLocal(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

function removeLocal(keys: string[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(keys, () => resolve());
  });
}

function getSession<T>(key: string): Promise<T | null> {
  return new Promise((resolve) => {
    chrome.storage.session.get([key], (result) => {
      const value = result[key];
      resolve((value as T | undefined) ?? null);
    });
  });
}

function setSession(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.session.set({ [key]: value }, () => resolve());
  });
}

function removeSession(keys: string[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.session.remove(keys, () => resolve());
  });
}

export const tokenStorage = {
  async saveAccessToken(token: string): Promise<void> {
    await Promise.all([
      setLocal(STORAGE_KEYS.ACCESS_TOKEN, token),
      setSession(STORAGE_KEYS.ACCESS_TOKEN, token),
    ]);
  },

  async getAccessToken(): Promise<string | null> {
    const session = await getSession<string>(STORAGE_KEYS.ACCESS_TOKEN);
    if (session) return session;
    return getLocal<string>(STORAGE_KEYS.ACCESS_TOKEN);
  },

  async saveRefreshToken(token: string): Promise<void> {
    await setLocal(STORAGE_KEYS.REFRESH_TOKEN, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return getLocal<string>(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async saveCachedUser(user: SafeUser): Promise<void> {
    await setLocal(STORAGE_KEYS.CACHED_USER, user);
  },

  async getCachedUser(): Promise<SafeUser | null> {
    return getLocal<SafeUser>(STORAGE_KEYS.CACHED_USER);
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      removeLocal([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.CACHED_USER,
        STORAGE_KEYS.LAST_UNREAD_COUNT,
      ]),
      removeSession([STORAGE_KEYS.ACCESS_TOKEN]),
    ]);
  },

  async setPendingAiPrompt(text: string): Promise<void> {
    await setSession(STORAGE_KEYS.PENDING_AI_PROMPT, text);
  },

  async consumePendingAiPrompt(): Promise<string | null> {
    const value = await getSession<string>(STORAGE_KEYS.PENDING_AI_PROMPT);
    if (value) {
      await removeSession([STORAGE_KEYS.PENDING_AI_PROMPT]);
    }
    return value;
  },

  async setPendingSavePage(page: PendingSavePage): Promise<void> {
    await setSession(STORAGE_KEYS.PENDING_SAVE_PAGE, page);
  },

  async consumePendingSavePage(): Promise<PendingSavePage | null> {
    const value = await getSession<PendingSavePage>(
      STORAGE_KEYS.PENDING_SAVE_PAGE,
    );
    if (value) {
      await removeSession([STORAGE_KEYS.PENDING_SAVE_PAGE]);
    }
    return value;
  },

  async setLastUnreadCount(count: number): Promise<void> {
    await setLocal(STORAGE_KEYS.LAST_UNREAD_COUNT, count);
  },

  async getLastUnreadCount(): Promise<number> {
    return (await getLocal<number>(STORAGE_KEYS.LAST_UNREAD_COUNT)) ?? 0;
  },
};

/**
 * Parse refresh token from Set-Cookie header(s).
 * Backend sets `refresh-token` (dev) or `__Secure-refresh-token` (prod).
 */
export function extractRefreshTokenFromSetCookie(
  setCookieHeader: string | null,
): string | null {
  if (!setCookieHeader) {
    return null;
  }

  const match = setCookieHeader.match(/(?:__Secure-)?refresh-token=([^;]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Build Cookie header for auth endpoints (path=/api/v1/auth).
 * Mirrors the mobile client pattern for production Railway refresh.
 */
export function buildRefreshCookieHeader(refreshToken: string): string {
  return `refresh-token=${encodeURIComponent(refreshToken)}; __Secure-refresh-token=${encodeURIComponent(refreshToken)}`;
}
