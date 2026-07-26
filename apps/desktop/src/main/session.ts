import { session } from "electron";
import log from "electron-log";

import { SESSION_PARTITION, getApiUrl, getWebUrl } from "./config";

/**
 * Persistent Chromium session for EliteFlow.
 *
 * Auth model (unchanged from web):
 * - Access JWT in page memory
 * - httpOnly refresh cookie from the API
 * - auth-session-hint cookie for Next middleware
 *
 * Using `persist:eliteflow` keeps cookies + localStorage across app restarts
 * so users stay logged in after closing the desktop app.
 */
export function getAppSession() {
  return session.fromPartition(SESSION_PARTITION, { cache: true });
}

export async function configureSession(): Promise<void> {
  const ses = getAppSession();

  // Persist cookies to disk (default for persist: partitions).
  ses.cookies.on("changed", (_event, cookie, _cause, removed) => {
    if (removed) {
      return;
    }
    const name = cookie.name.toLowerCase();
    if (
      name.includes("refresh") ||
      name.includes("session") ||
      name === "auth-session-hint"
    ) {
      log.debug(`[session] cookie upsert: ${cookie.name} @ ${cookie.domain}`);
    }
  });

  // Prefer secure cookies when talking to production HTTPS API.
  const apiUrl = getApiUrl();
  const webUrl = getWebUrl();
  log.info(`[session] partition=${SESSION_PARTITION}`);
  log.info(`[session] web=${webUrl}`);
  log.info(`[session] api=${apiUrl}`);

  // Clear only cache on demand via env (not cookies) — keeps login sticky.
  if (process.env.ELITEFLOW_CLEAR_CACHE === "1") {
    await ses.clearCache();
    log.info("[session] HTTP cache cleared (cookies preserved)");
  }
}

export async function flushSession(): Promise<void> {
  const ses = getAppSession();
  await ses.cookies.flushStore();
}
