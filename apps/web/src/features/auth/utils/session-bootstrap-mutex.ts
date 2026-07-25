/**
 * Cross-chunk bootstrap mutex (shared by session-bootstrap + api-client).
 * Kept in its own module to avoid circular imports with refreshAccessToken.
 */
const BOOTSTRAP_MUTEX_KEY = "__eliteflow_session_bootstrap__" as const;

type GlobalWithBootstrap = typeof globalThis & {
  [BOOTSTRAP_MUTEX_KEY]?: Promise<void> | null;
};

export function getSessionBootstrapPromise(): Promise<void> | null {
  return (globalThis as GlobalWithBootstrap)[BOOTSTRAP_MUTEX_KEY] ?? null;
}

export function setSessionBootstrapPromise(
  promise: Promise<void> | null,
): void {
  (globalThis as GlobalWithBootstrap)[BOOTSTRAP_MUTEX_KEY] = promise;
}

export function resetSessionBootstrap(): void {
  setSessionBootstrapPromise(null);
}
