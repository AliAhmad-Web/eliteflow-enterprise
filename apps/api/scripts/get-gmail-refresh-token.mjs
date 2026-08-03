/**
 * One-time helper: opens Google consent, captures refresh token, writes apps/api/.env
 * Uses existing GOOGLE_OAUTH_REDIRECT_URI (API must not be bound to :4000 while this runs).
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");

function readEnv() {
  return readFileSync(envPath, "utf8");
}

function getEnvValue(raw, key) {
  const match = raw.match(new RegExp(`^${key}="?([^"\\r\\n]*)"?$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function upsertEnv(raw, key, value) {
  const line = `${key}="${value}"`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(raw)) return raw.replace(re, line);
  return `${raw.trimEnd()}\n${line}\n`;
}

const raw = readEnv();
const clientId =
  getEnvValue(raw, "GMAIL_OAUTH_CLIENT_ID") ||
  getEnvValue(raw, "GOOGLE_CLIENT_ID");
const clientSecret =
  getEnvValue(raw, "GMAIL_OAUTH_CLIENT_SECRET") ||
  getEnvValue(raw, "GOOGLE_CLIENT_SECRET");
// Dedicated local callback (must be listed in Google Cloud → Authorized redirect URIs).
const redirectUri = "http://localhost:4810/oauth2callback";

if (!clientId || !clientSecret) {
  console.error("Missing Gmail/Google OAuth client id/secret in .env");
  process.exit(1);
}

const scope = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("redirect_uri", redirectUri);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", scope);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

const redirect = new URL(redirectUri);
const port = Number(redirect.port || 80);
const path = redirect.pathname;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    if (url.pathname !== path) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const code = url.searchParams.get("code");
    const err = url.searchParams.get("error");
    if (err) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<h1>OAuth error</h1><p>${err}</p>`);
      console.error("OAuth error:", err);
      server.close();
      process.exit(1);
    }
    if (!code) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>Missing code</h1>");
      return;
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.refresh_token) {
      res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        `<h1>Token exchange failed</h1><pre>${JSON.stringify(tokens, null, 2)}</pre>
         <p>If refresh_token is missing, revoke app access at
         https://myaccount.google.com/permissions and try again.</p>`,
      );
      console.error("Token exchange failed:", tokens);
      server.close();
      process.exit(1);
    }

    let next = readEnv();
    next = upsertEnv(next, "GMAIL_OAUTH_REFRESH_TOKEN", tokens.refresh_token);
    next = upsertEnv(next, "EMAIL_PROVIDER", "gmail_api");
    writeFileSync(envPath, next, "utf8");

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<h1>Success</h1><p>Gmail refresh token saved to apps/api/.env. You can close this tab.</p>",
    );
    console.log("Saved GMAIL_OAUTH_REFRESH_TOKEN to apps/api/.env");
    server.close();
    process.exit(0);
  } catch (error) {
    console.error(error);
    res.writeHead(500);
    res.end("Server error");
    server.close();
    process.exit(1);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Listening for OAuth callback on ${redirectUri}`);
  console.log("Opening browser — sign in as alikhanhi912@gmail.com and click Allow…");
  console.log(authUrl.toString());
  const opener =
    process.platform === "win32"
      ? `start "" "${authUrl.toString()}"`
      : process.platform === "darwin"
        ? `open "${authUrl.toString()}"`
        : `xdg-open "${authUrl.toString()}"`;
  exec(opener);
});

setTimeout(() => {
  console.error("Timed out waiting for Google consent (5 min).");
  server.close();
  process.exit(1);
}, 5 * 60 * 1000);
