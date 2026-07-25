const SESSION_HINT_COOKIE = "auth-session-hint";
const SESSION_HINT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function setSessionHintCookie(): void {
  if (typeof document === "undefined") {
    return;
  }

  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";

  document.cookie = `${SESSION_HINT_COOKIE}=1; path=/; max-age=${SESSION_HINT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function clearSessionHintCookie(): void {
  if (typeof document === "undefined") {
    return;
  }

  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";

  document.cookie = `${SESSION_HINT_COOKIE}=; path=/; max-age=0; SameSite=Lax${secure}`;
}

export function getSessionHintCookieName(): string {
  return SESSION_HINT_COOKIE;
}

/** Sync client read — used for optimistic shell render (no auth spinner on nav). */
export function hasSessionHintCookie(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  const prefix = `${SESSION_HINT_COOKIE}=`;
  return document.cookie.split(";").some((part) => part.trim().startsWith(prefix));
}
