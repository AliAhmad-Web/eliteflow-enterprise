import { authService } from "@/api/auth.service";
import { refreshAccessToken } from "@/api/api-client";
import { useAuthStore } from "@/auth/auth.store";
import { secureTokenStorage } from "@/auth/secure-token-storage";

/**
 * Restore session on cold start:
 * 1. Hydrate access token + cached user from secure storage
 * 2. If refresh token exists, rotate access token
 * 3. Fetch /me to validate and refresh profile
 */
export async function bootstrapSession(): Promise<boolean> {
  const store = useAuthStore.getState();

  await store.hydrateFromStorage();

  const refreshToken = await secureTokenStorage.getRefreshToken();
  const accessToken = useAuthStore.getState().accessToken;

  if (!refreshToken && !accessToken) {
    store.setInitialized(true);
    return false;
  }

  try {
    if (refreshToken) {
      const newToken = await refreshAccessToken();
      if (!newToken && !accessToken) {
        await store.clearSession();
        store.setInitialized(true);
        return false;
      }
    }

    await authService.getMe();
    store.setInitialized(true);
    return true;
  } catch {
    // Soft failure: keep cached user if we still have a token (offline-ish),
    // otherwise clear.
    const stillHasToken = Boolean(useAuthStore.getState().accessToken);
    if (!stillHasToken) {
      await store.clearSession();
    }
    store.setInitialized(true);
    return stillHasToken;
  }
}
