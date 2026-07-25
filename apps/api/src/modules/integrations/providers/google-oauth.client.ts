import {
  getGoogleOAuthConfig,
  GMAIL_CONNECT_SCOPES,
  GOOGLE_CALENDAR_CONNECT_SCOPES,
  type OAuthSlug,
} from "../oauth/oauth-config.js";

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
}

function assertGoogleConfigured(): ReturnType<typeof getGoogleOAuthConfig> {
  const config = getGoogleOAuthConfig();
  if (!config.configured) {
    throw new Error(
      "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and redirect URI.",
    );
  }
  return config;
}

/**
 * Google authorization URL — authorization code + PKCE + offline access.
 * @see https://developers.google.com/identity/protocols/oauth2/web-server
 */
export function buildGoogleAuthorizeUrl(input: {
  slug: "gmail" | "google_calendar";
  state: string;
  codeChallenge: string;
}): string {
  const { clientId, redirectUri } = assertGoogleConfigured();
  const scopes =
    input.slug === "gmail"
      ? GMAIL_CONNECT_SCOPES
      : GOOGLE_CALENDAR_CONNECT_SCOPES;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(input: {
  code: string;
  codeVerifier: string;
}): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, redirectUri } = assertGoogleConfigured();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: input.codeVerifier,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token exchange failed: ${text.slice(0, 300)}`);
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = assertGoogleConfigured();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token refresh failed: ${text.slice(0, 300)}`);
  }

  return (await response.json()) as GoogleTokenResponse;
}

/** Revoke access or refresh token at Google (best-effort). */
export async function revokeGoogleToken(token: string): Promise<void> {
  const response = await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  });
  if (!response.ok && response.status !== 400) {
    const text = await response.text();
    throw new Error(`Google token revoke failed: ${text.slice(0, 300)}`);
  }
}

export async function probeGoogleUserInfo(accessToken: string): Promise<{
  email?: string;
  name?: string;
  sub?: string;
}> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok) {
    throw new Error(`Google userinfo probe failed (${response.status})`);
  }
  return (await response.json()) as {
    email?: string;
    name?: string;
    sub?: string;
  };
}

/** Lightweight Gmail connection probe — no inbox sync. */
export async function probeGmailConnection(accessToken: string): Promise<void> {
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (response.ok) return;

  const detail = await readGoogleErrorDetail(response);
  const apiDisabled =
    response.status === 403 &&
    /accessNotConfigured|SERVICE_DISABLED|Gmail API has not been used|API has not been enabled/i.test(
      detail,
    );

  if (apiDisabled) {
    // OAuth tokens are valid; Gmail API is off on the GCP project.
    // Verify identity with scopes we always request, then guide the operator.
    await probeGoogleUserInfo(accessToken);
    throw new Error(
      "Gmail OAuth succeeded, but the Gmail API is not enabled on this Google Cloud project. Enable it at https://console.cloud.google.com/apis/library/gmail.googleapis.com then run Test Connection again.",
    );
  }

  // Token/scope issues: still confirm identity so operators see a clear next step.
  if (response.status === 403) {
    try {
      await probeGoogleUserInfo(accessToken);
    } catch {
      // ignore — surface the Gmail error below
    }
    throw new Error(
      `Gmail profile probe failed (403). ${detail || "Confirm gmail.metadata was granted and the account is a Test user."}`.slice(
        0,
        500,
      ),
    );
  }

  throw new Error(
    `Gmail profile probe failed (${response.status})${detail ? `: ${detail}` : ""}`.slice(
      0,
      500,
    ),
  );
}

async function readGoogleErrorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) return "";
    const parsed = JSON.parse(text) as {
      error?: { message?: string; status?: string; errors?: { reason?: string }[] };
    };
    const reason = parsed.error?.errors?.[0]?.reason;
    const message = parsed.error?.message ?? text;
    return reason ? `${reason}: ${message}` : message;
  } catch {
    return "";
  }
}

/** Lightweight Calendar connection probe — no event sync. */
export async function probeGoogleCalendarConnection(
  accessToken: string,
): Promise<void> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok) {
    throw new Error(`Google Calendar probe failed (${response.status})`);
  }
}

export function googleWebhookEvents(slug: OAuthSlug): string[] {
  if (slug === "gmail") {
    return ["gmail.mailbox", "gmail.labels"];
  }
  if (slug === "google_calendar") {
    return ["calendar.events", "calendar.reminders"];
  }
  return [];
}
