/**
 * Dispatch transactional email to GitHub Actions (HTTPS).
 * Used when the API host blocks outbound SMTP (e.g. Railway → Gmail).
 */
import { emailConfig } from "../../config/email.config.js";

export function isGithubEmailRelayConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_EMAIL_RELAY_TOKEN?.trim() &&
      process.env.GITHUB_EMAIL_RELAY_REPO?.trim(),
  );
}

export async function sendViaGithubEmailRelay(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ id?: string }> {
  const token = process.env.GITHUB_EMAIL_RELAY_TOKEN?.trim();
  const repo = process.env.GITHUB_EMAIL_RELAY_REPO?.trim();
  if (!token || !repo) {
    throw new Error("GitHub email relay is not configured");
  }

  const response = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": `${emailConfig.appName}-api`,
    },
    body: JSON.stringify({
      event_type: "transactional_email",
      client_payload: {
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `GitHub email relay failed (${response.status}): ${detail.slice(0, 300)}`,
    );
  }

  // repository_dispatch returns 204 with empty body
  return { id: `github-dispatch:${Date.now()}` };
}
