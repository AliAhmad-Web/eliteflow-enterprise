import { app, ipcMain } from "electron";
import log from "electron-log";
import Store from "electron-store";

import { initAutoUpdater } from "./auto-updater";
import { APP_ID, APP_NAME, getApiUrl, getWebUrl, isDev } from "./config";
import {
  handleDeepLinkNavigation,
  registerDeepLinkProtocol,
} from "./deep-links";
import { attachDownloadHandlers } from "./downloads";
import { registerIpcHandlers } from "./ipc";
import { applySecurityHardening } from "./security";
import { configureSession, flushSession } from "./session";
import { createTrayIfEnabled, destroyTray } from "./tray";
import { createMainWindow, getMainWindow } from "./window";

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  bootstrap();
}

function bootstrap(): void {
  log.transports.file.level = "info";
  log.transports.console.level = isDev() ? "debug" : "info";

  app.setName(APP_NAME);
  app.setAppUserModelId(APP_ID);

  // Persist lightweight desktop preferences (not auth tokens).
  const store = new Store<{ lastWebUrl: string; launchCount: number }>({
    name: "eliteflow-desktop",
    defaults: {
      lastWebUrl: getWebUrl(),
      launchCount: 0,
    },
  });

  registerDeepLinkProtocol();

  app.on("second-instance", (_event, argv) => {
    const deepLink = argv.find((arg) => arg.startsWith("eliteflow://"));
    if (deepLink) {
      handleDeepLinkNavigation(deepLink, getWebUrl());
    }
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) {
        win.restore();
      }
      win.focus();
    }
  });

  // macOS / some Windows handlers
  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleDeepLinkNavigation(url, getWebUrl());
  });

  app.whenReady().then(async () => {
    store.set("launchCount", store.get("launchCount") + 1);
    store.set("lastWebUrl", getWebUrl());

    log.info("========================================");
    log.info(` EliteFlow Desktop v${app.getVersion()}`);
    log.info(` Mode: ${isDev() ? "development" : "production"}`);
    log.info(` Web:  ${getWebUrl()}`);
    log.info(` API:  ${getApiUrl()}`);
    log.info("========================================");

    applySecurityHardening();
    await configureSession();
    attachDownloadHandlers();
    registerIpcHandlers(ipcMain);
    initAutoUpdater();

    createMainWindow();
    createTrayIfEnabled();

    app.on("activate", () => {
      if (!getMainWindow()) {
        createMainWindow();
      }
    });
  });

  app.on("before-quit", () => {
    void flushSession();
    destroyTray();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
