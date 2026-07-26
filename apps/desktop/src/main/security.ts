import { app, session } from "electron";
import log from "electron-log";

import { SESSION_PARTITION } from "./config";

/**
 * Harden the Chromium session used by EliteFlow Desktop.
 */
export function applySecurityHardening(): void {
  // Deny permission requests that the web app does not need natively.
  const ses = session.fromPartition(SESSION_PARTITION);
  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = new Set([
      "notifications",
      "clipboard-read",
      "clipboard-sanitized-write",
      "media",
    ]);
    const grant = allowed.has(permission);
    if (!grant) {
      log.warn(`[security] denied permission: ${permission}`);
    }
    callback(grant);
  });

  app.on("web-contents-created", (_event, contents) => {
    contents.on("will-attach-webview", (event) => {
      // EliteFlow does not use <webview> tags.
      event.preventDefault();
    });
  });

  log.info("[security] contextIsolation=on nodeIntegration=off sandbox=on");
}
