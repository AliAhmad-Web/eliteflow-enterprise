const RELOAD_GUARD_KEY = "eliteflow:chunk-reload";

function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const name = "name" in error ? String(error.name) : "";
  const message = "message" in error ? String(error.message) : "";

  return (
    name === "ChunkLoadError" ||
    /Loading chunk [\w-]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message)
  );
}

/**
 * Recover from stale Next.js chunk hashes after a deploy.
 * Reloads once; if it still fails, the normal error UI is shown.
 */
export function recoverFromChunkLoadError(error: unknown): boolean {
  if (typeof window === "undefined" || !isChunkLoadError(error)) {
    return false;
  }

  try {
    const lastReloadAt = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? "0");
    const now = Date.now();

    // Avoid reload loops within 15s.
    if (Number.isFinite(lastReloadAt) && now - lastReloadAt < 15_000) {
      return false;
    }

    sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
  } catch {
    // sessionStorage may be blocked; still attempt a one-shot reload.
  }

  window.location.reload();
  return true;
}

export function clearChunkReloadGuard(): void {
  try {
    sessionStorage.removeItem(RELOAD_GUARD_KEY);
  } catch {
    // ignore
  }
}
