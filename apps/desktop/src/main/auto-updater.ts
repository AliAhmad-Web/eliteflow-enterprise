import log from "electron-log";
import { autoUpdater } from "electron-updater";

import type { DesktopUpdateStatus } from "../shared/types";

/**
 * Auto-update architecture (prepared only).
 *
 * electron-updater is wired but does not force installs until a release feed
 * is published at https://releases.eliteflow.app/desktop/
 *
 * When ready:
 * 1. Publish NSIS artifacts + latest.yml to the generic provider URL
 * 2. Set ELITEFLOW_ENABLE_AUTO_UPDATE=1 (or flip DEFAULT_ENABLED)
 * 3. Users will receive update checks on launch
 */
const DEFAULT_ENABLED = false;

let status: DesktopUpdateStatus = {
  prepared: true,
  checking: false,
  available: false,
  downloaded: false,
  message:
    "Auto-update architecture is prepared. Publish releases to enable live updates.",
};

export function getUpdateStatus(): DesktopUpdateStatus {
  return { ...status };
}

export function isAutoUpdateEnabled(): boolean {
  return (
    process.env.ELITEFLOW_ENABLE_AUTO_UPDATE === "1" || DEFAULT_ENABLED
  );
}

export function initAutoUpdater(): void {
  if (!isAutoUpdateEnabled()) {
    log.info(
      "[updater] prepared but disabled (set ELITEFLOW_ENABLE_AUTO_UPDATE=1)",
    );
    return;
  }

  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    status = { ...status, checking: true, message: "Checking for updates…" };
  });

  autoUpdater.on("update-available", (info) => {
    status = {
      ...status,
      checking: false,
      available: true,
      version: info.version,
      message: `Update ${info.version} is available.`,
    };
  });

  autoUpdater.on("update-not-available", () => {
    status = {
      ...status,
      checking: false,
      available: false,
      message: "You are on the latest version.",
    };
  });

  autoUpdater.on("error", (error) => {
    status = {
      ...status,
      checking: false,
      error: error.message,
      message: `Update error: ${error.message}`,
    };
    log.error("[updater]", error);
  });

  autoUpdater.on("update-downloaded", (info) => {
    status = {
      ...status,
      downloaded: true,
      version: info.version,
      message: `Update ${info.version} downloaded. Restart to install.`,
    };
  });

  log.info("[updater] electron-updater initialized");
}

export async function checkForUpdates(): Promise<DesktopUpdateStatus> {
  if (!isAutoUpdateEnabled()) {
    return getUpdateStatus();
  }

  try {
    status = { ...status, checking: true, message: "Checking for updates…" };
    await autoUpdater.checkForUpdates();
  } catch (error) {
    status = {
      ...status,
      checking: false,
      error: error instanceof Error ? error.message : String(error),
      message: "Update check failed.",
    };
  }

  return getUpdateStatus();
}
