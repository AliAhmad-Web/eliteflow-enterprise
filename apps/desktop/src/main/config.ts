import path from "node:path";

import { app } from "electron";

/**
 * Desktop runtime configuration.
 *
 * EliteFlow Desktop is a thin Electron client over the SAME web + API stack:
 * - Development → local Next.js (http://localhost:3000)
 * - Production  → hosted web app (https://eliteflow-web.vercel.app) → Railway API
 */
export const APP_NAME = "EliteFlow";
export const APP_ID = "com.eliteflow.desktop";
export const PROTOCOL_SCHEME = "eliteflow";

/** Production web origin (Next.js on Vercel). */
export const PRODUCTION_WEB_URL = "https://eliteflow-web.vercel.app";

/** Custom domain (when DNS is attached). */
export const PRODUCTION_WEB_CUSTOM_DOMAIN = "https://eliteflow.app";

/** Production API origin (Railway). */
export const PRODUCTION_API_URL =
  "https://api-production-a778.up.railway.app";

/** Local development web origin. */
export const DEV_WEB_URL = "http://localhost:3000";

/** Local development API origin. */
export const DEV_API_URL = "http://localhost:4000";

/** Persistent Chromium session partition — keeps auth cookies across restarts. */
export const SESSION_PARTITION = "persist:eliteflow";

export function isDev(): boolean {
  if (process.env.ELITEFLOW_DESKTOP_ENV === "development") {
    return true;
  }
  if (process.env.ELITEFLOW_DESKTOP_ENV === "production") {
    return false;
  }
  return !app.isPackaged;
}

export function getWebUrl(): string {
  const override = process.env.ELITEFLOW_WEB_URL?.trim();
  if (override) {
    return override.replace(/\/$/, "");
  }
  return isDev() ? DEV_WEB_URL : PRODUCTION_WEB_URL;
}

export function getApiUrl(): string {
  const override = process.env.ELITEFLOW_API_URL?.trim();
  if (override) {
    return override.replace(/\/$/, "");
  }
  return isDev() ? DEV_API_URL : PRODUCTION_API_URL;
}

export function getPreloadPath(): string {
  return path.join(__dirname, "..", "preload", "index.js");
}

/** Hosts allowed for navigation inside the BrowserWindow. */
export function getAllowedNavigationHosts(): string[] {
  const hosts = new Set<string>();

  for (const raw of [
    getWebUrl(),
    PRODUCTION_WEB_URL,
    PRODUCTION_WEB_CUSTOM_DOMAIN,
    DEV_WEB_URL,
  ]) {
    try {
      hosts.add(new URL(raw).host);
    } catch {
      // ignore invalid
    }
  }

  hosts.add("localhost:3000");
  hosts.add("127.0.0.1:3000");
  hosts.add("eliteflow-web.vercel.app");
  hosts.add("eliteflow.app");
  hosts.add("www.eliteflow.app");
  hosts.add("app.eliteflow.app");

  // OAuth / identity providers used by the existing web auth flow
  hosts.add("accounts.google.com");
  hosts.add("github.com");
  hosts.add("api.github.com");

  return [...hosts];
}

/** Allowlist match for navigation (exact host or trusted suffix). */
export function isAllowedNavigationUrl(urlString: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false;
  }

  const host = parsed.host.toLowerCase();
  if (getAllowedNavigationHosts().some((h) => h.toLowerCase() === host)) {
    return true;
  }

  // Supabase Auth hosted pages / project domains
  if (host.endsWith(".supabase.co") || host === "supabase.co") {
    return true;
  }

  return false;
}

/** External URL hosts that may open in the system browser (not in-app). */
export function isAllowedExternalUrl(urlString: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  if (
    parsed.protocol !== "https:" &&
    parsed.protocol !== "http:" &&
    parsed.protocol !== "mailto:"
  ) {
    return false;
  }

  const lower = urlString.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("file:") ||
    lower.startsWith("vbscript:")
  ) {
    return false;
  }

  return true;
}
