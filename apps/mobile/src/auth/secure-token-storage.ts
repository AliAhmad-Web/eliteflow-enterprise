import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "eliteflow.accessToken";
const REFRESH_TOKEN_KEY = "eliteflow.refreshToken";
const CACHED_USER_KEY = "eliteflow.authUser";

/**
 * Secure token storage for native platforms.
 * Falls back to in-memory + AsyncStorage-equivalent via SecureStore on web
 * is unsupported — use a simple memory map for web previews.
 */
const memoryFallback = new Map<string, string>();

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    memoryFallback.set(key, value);
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(key) ?? memoryFallback.get(key) ?? null;
    } catch {
      return memoryFallback.get(key) ?? null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    memoryFallback.delete(key);
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const secureTokenStorage = {
  async saveAccessToken(token: string): Promise<void> {
    await setItem(ACCESS_TOKEN_KEY, token);
  },

  async getAccessToken(): Promise<string | null> {
    return getItem(ACCESS_TOKEN_KEY);
  },

  async saveRefreshToken(token: string): Promise<void> {
    await setItem(REFRESH_TOKEN_KEY, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return getItem(REFRESH_TOKEN_KEY);
  },

  async saveCachedUser(json: string): Promise<void> {
    await setItem(CACHED_USER_KEY, json);
  },

  async getCachedUser(): Promise<string | null> {
    return getItem(CACHED_USER_KEY);
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      deleteItem(ACCESS_TOKEN_KEY),
      deleteItem(REFRESH_TOKEN_KEY),
      deleteItem(CACHED_USER_KEY),
    ]);
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

  const match = setCookieHeader.match(
    /(?:__Secure-)?refresh-token=([^;]+)/i,
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Build Cookie header for auth endpoints (path=/api/v1/auth).
 * Allows production refresh without backend changes — Express cookie-parser
 * reads the Cookie header the same as a browser jar.
 */
export function buildRefreshCookieHeader(refreshToken: string): string {
  // Prefer the name that matches NODE_ENV; send both-safe single value.
  // Production cookie name requires Secure; we still attach the value under
  // the expected name for the current environment via both candidates —
  // Express only needs one to match getRefreshTokenCookieName().
  return `refresh-token=${encodeURIComponent(refreshToken)}; __Secure-refresh-token=${encodeURIComponent(refreshToken)}`;
}
