/**
 * Send mail through Gmail API (HTTPS). Use this on hosts that block outbound SMTP
 * (e.g. Railway). Requires OAuth refresh token with gmail.send scope.
 */
import {
  emailConfig,
  isGmailApiConfigured,
} from "../../config/email.config.js";

interface GmailTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function getAccessToken(): Promise<string> {
  if (
    cachedAccessToken &&
    Date.now() < cachedAccessTokenExpiresAt - 60_000
  ) {
    return cachedAccessToken;
  }

  const body = new URLSearchParams({
    client_id: emailConfig.gmail.clientId,
    client_secret: emailConfig.gmail.clientSecret,
    refresh_token: emailConfig.gmail.refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const payload = (await response.json()) as GmailTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        `Gmail OAuth token refresh failed (${response.status})`,
    );
  }

  cachedAccessToken = payload.access_token;
  cachedAccessTokenExpiresAt =
    Date.now() + (payload.expires_in ?? 3600) * 1000;
  return cachedAccessToken;
}

function buildRawMime(input: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): string {
  const boundary = `eliteflow_${Date.now().toString(16)}`;
  const lines = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    input.text,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    input.html,
    "",
    `--${boundary}--`,
    "",
  ];
  return lines.join("\r\n");
}

export async function sendViaGmailApi(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ id?: string }> {
  if (!isGmailApiConfigured()) {
    throw new Error("Gmail API is not configured");
  }

  const accessToken = await getAccessToken();
  const raw = toBase64Url(
    buildRawMime({
      from: emailConfig.fromEmail,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  );

  const userId = encodeURIComponent(emailConfig.gmail.user || "me");
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${userId}/messages/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    },
  );

  const payload = (await response.json()) as {
    id?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(
      payload.error?.message || `Gmail API send failed (${response.status})`,
    );
  }

  return { id: payload.id };
}
