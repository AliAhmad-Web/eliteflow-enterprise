import {
  getGitHubOAuthConfig,
  GITHUB_CONNECT_SCOPES,
} from "../oauth/oauth-config.js";

export interface GitHubTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  token_type?: string;
  scope?: string;
}

function assertGitHubConfigured(): ReturnType<typeof getGitHubOAuthConfig> {
  const config = getGitHubOAuthConfig();
  if (!config.configured) {
    throw new Error(
      "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and redirect URI.",
    );
  }
  return config;
}

/**
 * GitHub authorization URL — authorization code + PKCE.
 * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
 */
export function buildGitHubAuthorizeUrl(input: {
  state: string;
  codeChallenge: string;
}): string {
  const { clientId, redirectUri } = assertGitHubConfigured();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: GITHUB_CONNECT_SCOPES.join(" "),
    state: input.state,
    allow_signup: "false",
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGitHubCode(input: {
  code: string;
  codeVerifier: string;
}): Promise<GitHubTokenResponse> {
  const { clientId, clientSecret, redirectUri } = assertGitHubConfigured();
  const response = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: input.code,
        redirect_uri: redirectUri,
        code_verifier: input.codeVerifier,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub token exchange failed: ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as GitHubTokenResponse & {
    error?: string;
    error_description?: string;
  };
  if (data.error) {
    throw new Error(
      data.error_description || data.error || "GitHub OAuth error",
    );
  }
  if (!data.access_token) {
    throw new Error("GitHub OAuth response missing access_token");
  }
  return data;
}

export async function refreshGitHubAccessToken(
  refreshToken: string,
): Promise<GitHubTokenResponse> {
  const { clientId, clientSecret } = assertGitHubConfigured();
  const response = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub token refresh failed: ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as GitHubTokenResponse & {
    error?: string;
    error_description?: string;
  };
  if (data.error) {
    throw new Error(
      data.error_description || data.error || "GitHub refresh error",
    );
  }
  if (!data.access_token) {
    throw new Error("GitHub refresh response missing access_token");
  }
  return data;
}

/**
 * Revoke an OAuth access token for this GitHub App / OAuth App.
 * @see https://docs.github.com/en/rest/apps/oauth-applications#delete-an-app-token
 */
export async function revokeGitHubToken(accessToken: string): Promise<void> {
  const { clientId, clientSecret } = assertGitHubConfigured();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(
    `https://api.github.com/applications/${clientId}/token`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Basic ${basic}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: accessToken }),
    },
  );
  // 204 success; 404 already revoked
  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(`GitHub token revoke failed: ${text.slice(0, 300)}`);
  }
}

export async function probeGitHubConnection(accessToken: string): Promise<{
  login?: string;
  name?: string;
  id?: number;
}> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub user probe failed (${response.status})`);
  }
  return (await response.json()) as {
    login?: string;
    name?: string;
    id?: number;
  };
}

export const GITHUB_WEBHOOK_EVENTS = [
  "push",
  "pull_request",
  "issues",
  "create",
] as const;
