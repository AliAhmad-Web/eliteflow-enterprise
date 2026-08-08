/**
 * Capture OAuth redirect params before Supabase/Next.js can strip the URL.
 * Implicit flow puts tokens in the hash; PKCE puts `code` in the query.
 */
export const OAUTH_REDIRECT_CAPTURE_KEY = "eliteflow.oauth.redirect";

export type CapturedOAuthRedirect = {
  hash: string;
  search: string;
  href: string;
  ts: number;
};

export function captureOAuthRedirectParams(): CapturedOAuthRedirect | null {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash || "";
  const search = window.location.search || "";
  const hasCreds =
    hash.includes("access_token") ||
    search.includes("code=") ||
    hash.includes("error") ||
    search.includes("error=");

  if (!hasCreds) {
    return readCapturedOAuthRedirect();
  }

  const payload: CapturedOAuthRedirect = {
    hash,
    search,
    href: window.location.href,
    ts: Date.now(),
  };

  try {
    sessionStorage.setItem(OAUTH_REDIRECT_CAPTURE_KEY, JSON.stringify(payload));
  } catch {
    // private mode / blocked storage
  }

  return payload;
}

export function readCapturedOAuthRedirect(): CapturedOAuthRedirect | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(OAUTH_REDIRECT_CAPTURE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CapturedOAuthRedirect;
    if (!parsed || typeof parsed !== "object") return null;
    // Ignore captures older than 10 minutes.
    if (typeof parsed.ts === "number" && Date.now() - parsed.ts > 10 * 60_000) {
      sessionStorage.removeItem(OAUTH_REDIRECT_CAPTURE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearCapturedOAuthRedirect(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(OAUTH_REDIRECT_CAPTURE_KEY);
  } catch {
    // ignore
  }
}

export function getOAuthParamsFromCapture(
  capture: CapturedOAuthRedirect | null = readCapturedOAuthRedirect(),
): URLSearchParams {
  const query = new URLSearchParams(capture?.search?.replace(/^\?/, "") ?? "");
  const hash = new URLSearchParams(capture?.hash?.replace(/^#/, "") ?? "");
  // Prefer live URL, then fall back to captured values.
  if (typeof window !== "undefined") {
    const liveQuery = new URLSearchParams(window.location.search);
    const liveHash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    for (const [key, value] of liveQuery.entries()) {
      if (!query.has(key)) query.set(key, value);
    }
    for (const [key, value] of liveHash.entries()) {
      if (!hash.has(key)) hash.set(key, value);
    }
  }

  // Merge hash into a single view (hash wins for token fields).
  const merged = new URLSearchParams(query);
  for (const [key, value] of hash.entries()) {
    merged.set(key, value);
  }
  return merged;
}
