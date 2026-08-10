import { isSecuritySessionHardeningEnabled } from "@/features/security/feature-flags";

const SESSION_HINT_COOKIE = "auth-session-hint";
const SESSION_HINT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const HINT_PREFIX = "efsh.v1.";

function getSessionHintSecret(): string | undefined {
  const secret = process.env.SESSION_HINT_SECRET?.trim();
  return secret && secret.length >= 16 ? secret : undefined;
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i += 1) {
    binary += String.fromCharCode(view[i]!);
  }
  const b64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(binary, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmacSha256Base64Url(
  secret: string,
  message: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message),
  );
  return toBase64Url(signature);
}

function buildCookieAttributes(): string {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  return `path=/; max-age=${SESSION_HINT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

async function buildHardenedHintValue(): Promise<string | null> {
  const secret = getSessionHintSecret();
  if (!secret || !isSecuritySessionHardeningEnabled()) {
    return null;
  }

  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = toBase64Url(nonceBytes);
  const ts = Math.floor(Date.now() / 1000).toString(36);
  const payload = `${nonce}.${ts}`;
  const sig = await hmacSha256Base64Url(secret, payload);
  return `${HINT_PREFIX}${payload}.${sig}`;
}

/**
 * Validates a hardened session-hint cookie value.
 * Returns true for legacy `1` values when hardening is OFF (caller decides).
 */
export async function isValidSessionHintValue(
  value: string | undefined,
): Promise<boolean> {
  if (!value) return false;

  if (!isSecuritySessionHardeningEnabled()) {
    return value.length > 0;
  }

  const secret = getSessionHintSecret();
  // Fail open to presence check if secret not configured.
  if (!secret) {
    return value.length > 0;
  }

  if (!value.startsWith(HINT_PREFIX)) {
    return false;
  }

  const body = value.slice(HINT_PREFIX.length);
  const parts = body.split(".");
  if (parts.length !== 3) return false;
  const [nonce, ts, sig] = parts;
  if (!nonce || !ts || !sig) return false;

  const expected = await hmacSha256Base64Url(secret, `${nonce}.${ts}`);
  if (expected !== sig) return false;

  // Reject hints older than max age (clock skew tolerant).
  const issuedAt = Number.parseInt(ts, 36);
  if (!Number.isFinite(issuedAt)) return false;
  const ageSeconds = Math.floor(Date.now() / 1000) - issuedAt;
  return ageSeconds >= 0 && ageSeconds <= SESSION_HINT_MAX_AGE_SECONDS;
}

/**
 * Must be awaited before full-page navigations (OAuth callback → app shell).
 * Fire-and-forget callers may still call without await when navigation is delayed.
 */
export async function setSessionHintCookie(): Promise<void> {
  if (typeof document === "undefined") {
    return;
  }

  const hardened = await buildHardenedHintValue();
  const value = hardened ?? "1";
  document.cookie = `${SESSION_HINT_COOKIE}=${value}; ${buildCookieAttributes()}`;
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
  return document.cookie
    .split(";")
    .some((part) => part.trim().startsWith(prefix));
}
