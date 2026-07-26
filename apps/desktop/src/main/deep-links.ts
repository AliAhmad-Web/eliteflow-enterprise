import path from "node:path";

import { app } from "electron";
import log from "electron-log";

import { PROTOCOL_SCHEME } from "./config";
import { getMainWindow } from "./window";

/**
 * Deep link preparation for eliteflow:// URLs.
 *
 * Examples (future):
 *   eliteflow://tasks/123
 *   eliteflow://notifications/456
 *   eliteflow://auth/callback?...
 */
let pendingDeepLink: string | null = null;

export function getPendingDeepLink(): string | null {
  return pendingDeepLink;
}

export function consumePendingDeepLink(): string | null {
  const value = pendingDeepLink;
  pendingDeepLink = null;
  return value;
}

export function setPendingDeepLink(url: string): void {
  pendingDeepLink = url;
  log.info(`[deep-link] pending=${url}`);
}

export function registerDeepLinkProtocol(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [
        path.resolve(process.argv[1]!),
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
  }

  const fromArgv = process.argv.find((arg) =>
    arg.startsWith(`${PROTOCOL_SCHEME}://`),
  );
  if (fromArgv) {
    setPendingDeepLink(fromArgv);
  }

  log.info(`[deep-link] protocol registered: ${PROTOCOL_SCHEME}://`);
}

/**
 * Map eliteflow://path to the loaded web origin.
 * eliteflow://tasks/1 → https://eliteflow.app/tasks/1
 */
export function deepLinkToWebUrl(deepLink: string, webBase: string): string | null {
  try {
    const parsed = new URL(deepLink);
    if (parsed.protocol !== `${PROTOCOL_SCHEME}:`) {
      return null;
    }
    const pathAndQuery = `${parsed.pathname || "/"}${parsed.search}${parsed.hash}`;
    const normalized = pathAndQuery.startsWith("/")
      ? pathAndQuery
      : `/${pathAndQuery}`;
    return `${webBase.replace(/\/$/, "")}${normalized}`;
  } catch {
    return null;
  }
}

export function handleDeepLinkNavigation(deepLink: string, webBase: string): void {
  const target = deepLinkToWebUrl(deepLink, webBase);
  if (!target) {
    log.warn(`[deep-link] ignored invalid: ${deepLink}`);
    return;
  }

  const win = getMainWindow();
  if (!win || win.isDestroyed()) {
    setPendingDeepLink(deepLink);
    return;
  }

  win.show();
  win.focus();
  void win.loadURL(target);
  log.info(`[deep-link] navigated → ${target}`);
}
