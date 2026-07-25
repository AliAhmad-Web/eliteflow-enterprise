/**
 * Phase 19.2 — Production OAuth configuration.
 *
 * Least-privilege connect scopes for connection + health probes only.
 * Feature scopes (send mail, write events, repo) are catalogued for
 * incremental authorization in later phases — not requested at connect.
 */

export type OAuthSlug = "gmail" | "google_calendar" | "github";
export type OAuthRouteProvider = "gmail" | "google-calendar" | "github";

export const PROVIDER_ROUTE_TO_SLUG: Record<OAuthRouteProvider, OAuthSlug> = {
  gmail: "gmail",
  "google-calendar": "google_calendar",
  github: "github",
};

export const SLUG_TO_ROUTE_PROVIDER: Record<OAuthSlug, OAuthRouteProvider> = {
  gmail: "gmail",
  google_calendar: "google-calendar",
  github: "github",
};

export const OAUTH_API_VERSIONS: Record<OAuthSlug, string> = {
  gmail: "gmail.v1",
  google_calendar: "calendar.v3",
  github: "github.rest.v3",
};

/** Connect-time scopes — identity + minimal probe access. */
export const GMAIL_CONNECT_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.metadata",
] as const;

/** Incremental scopes for future email features (not requested at connect). */
export const GMAIL_FUTURE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.labels",
  "https://www.googleapis.com/auth/gmail.compose",
] as const;

export const GOOGLE_CALENDAR_CONNECT_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
] as const;

export const GOOGLE_CALENDAR_FUTURE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
] as const;

export const GITHUB_CONNECT_SCOPES = ["read:user", "user:email"] as const;

/** Incremental scope for future repository features. */
export const GITHUB_FUTURE_SCOPES = ["repo"] as const;

export const CREDENTIAL_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  TOKEN_TYPE: "token_type",
  SCOPE: "scope",
} as const;

export function getAppUrl(): string {
  const url =
    process.env.APP_URL?.replace(/\/$/, "") ||
    process.env.API_PUBLIC_URL?.replace(/\/$/, "");
  if (!url) {
    throw new Error(
      "APP_URL (or API_PUBLIC_URL) must be set for OAuth redirect URIs.",
    );
  }
  return url;
}

export function getFrontendUrl(): string {
  const url =
    process.env.FRONTEND_URL?.replace(/\/$/, "") ||
    process.env.CORS_ORIGIN?.replace(/\/$/, "");
  if (!url) {
    throw new Error(
      "FRONTEND_URL (or CORS_ORIGIN) must be set for OAuth post-callback redirects.",
    );
  }
  return url;
}

export function requireOAuthStateSecret(): string {
  const dedicated = process.env.INTEGRATIONS_OAUTH_STATE_SECRET?.trim();
  if (dedicated) return dedicated;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "INTEGRATIONS_OAUTH_STATE_SECRET is required in production.",
    );
  }

  const fallback =
    process.env.SETTINGS_ENCRYPTION_KEY?.trim() ||
    process.env.JWT_SECRET?.trim();
  if (!fallback) {
    throw new Error(
      "Set INTEGRATIONS_OAUTH_STATE_SECRET (or JWT_SECRET) for OAuth state signing.",
    );
  }
  return fallback;
}

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
  let redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() || "";
  if (!redirectUri) {
    try {
      redirectUri = `${getAppUrl()}/api/v1/integrations/oauth/callback/google`;
    } catch {
      redirectUri = "";
    }
  }
  return {
    clientId,
    clientSecret,
    redirectUri,
    configured: Boolean(clientId && clientSecret && redirectUri),
  };
}

export function getGitHubOAuthConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim() || "";
  let redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI?.trim() || "";
  if (!redirectUri) {
    try {
      redirectUri = `${getAppUrl()}/api/v1/integrations/oauth/callback/github`;
    } catch {
      redirectUri = "";
    }
  }
  return {
    clientId,
    clientSecret,
    redirectUri,
    configured: Boolean(clientId && clientSecret && redirectUri),
  };
}

export function scopesForSlug(slug: OAuthSlug): readonly string[] {
  switch (slug) {
    case "gmail":
      return GMAIL_CONNECT_SCOPES;
    case "google_calendar":
      return GOOGLE_CALENDAR_CONNECT_SCOPES;
    case "github":
      return GITHUB_CONNECT_SCOPES;
    default: {
      const _exhaustive: never = slug;
      return _exhaustive;
    }
  }
}

export function futureScopesForSlug(slug: OAuthSlug): readonly string[] {
  switch (slug) {
    case "gmail":
      return GMAIL_FUTURE_SCOPES;
    case "google_calendar":
      return GOOGLE_CALENDAR_FUTURE_SCOPES;
    case "github":
      return GITHUB_FUTURE_SCOPES;
    default: {
      const _exhaustive: never = slug;
      return _exhaustive;
    }
  }
}
