import {
  BrowserWindow,
  Notification,
  app,
  clipboard,
  dialog,
  shell,
} from "electron";
import log from "electron-log";

import { IpcChannels } from "../shared/channels";
import type {
  DesktopAppInfo,
  DesktopDownloadRequest,
  DesktopDownloadResult,
  DesktopFilePickResult,
  DesktopNotificationPayload,
  DesktopPaths,
  DesktopUpdateStatus,
} from "../shared/types";
import { checkForUpdates, getUpdateStatus } from "./auto-updater";
import { getApiUrl, getWebUrl, isAllowedExternalUrl, isDev } from "./config";
import { consumePendingDeepLink, getPendingDeepLink } from "./deep-links";
import { startDownload } from "./downloads";
import { getMainWindow } from "./window";

type IpcHandler = (
  event: Electron.IpcMainInvokeEvent,
  ...args: unknown[]
) => unknown | Promise<unknown>;

const handlers = new Map<string, IpcHandler>();

function register(channel: string, handler: IpcHandler): void {
  handlers.set(channel, handler);
}

function requireMainWindow(): BrowserWindow {
  const win = getMainWindow();
  if (!win || win.isDestroyed()) {
    throw new Error("Main window is not available");
  }
  return win;
}

export function registerIpcHandlers(ipcMain: Electron.IpcMain): void {
  register(IpcChannels.APP_GET_INFO, (): DesktopAppInfo => ({
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    isPackaged: app.isPackaged,
    webUrl: getWebUrl(),
    apiUrl: getApiUrl(),
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
  }));

  register(IpcChannels.APP_GET_PATHS, (): DesktopPaths => ({
    userData: app.getPath("userData"),
    downloads: app.getPath("downloads"),
    temp: app.getPath("temp"),
    logs: app.getPath("logs"),
  }));

  register(IpcChannels.WINDOW_MINIMIZE, () => {
    requireMainWindow().minimize();
  });

  register(IpcChannels.WINDOW_MAXIMIZE, () => {
    const win = requireMainWindow();
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  register(IpcChannels.WINDOW_CLOSE, () => {
    requireMainWindow().close();
  });

  register(IpcChannels.WINDOW_IS_MAXIMIZED, () => requireMainWindow().isMaximized());

  register(
    IpcChannels.NOTIFICATION_SHOW,
    (_event, payloadUnknown): boolean => {
      const payload = payloadUnknown as DesktopNotificationPayload;
      if (!payload?.title || typeof payload.title !== "string") {
        return false;
      }
      if (!Notification.isSupported()) {
        log.warn("[notification] not supported on this platform");
        return false;
      }

      const notification = new Notification({
        title: payload.title.slice(0, 256),
        body: (payload.body ?? "").slice(0, 1024),
        silent: Boolean(payload.silent),
      });

      if (payload.deepLink && typeof payload.deepLink === "string") {
        notification.on("click", () => {
          const win = getMainWindow();
          if (!win || win.isDestroyed()) {
            return;
          }
          win.show();
          win.focus();
          const target = payload.deepLink!;
          if (target.startsWith("http") || target.startsWith("/")) {
            const base = getWebUrl();
            const url = target.startsWith("http")
              ? target
              : `${base}${target.startsWith("/") ? "" : "/"}${target}`;
            void win.loadURL(url);
          }
        });
      }

      notification.show();
      return true;
    },
  );

  register(IpcChannels.CLIPBOARD_WRITE_TEXT, (_event, textUnknown) => {
    if (typeof textUnknown !== "string") {
      throw new Error("clipboard text must be a string");
    }
    clipboard.writeText(textUnknown);
  });

  register(IpcChannels.CLIPBOARD_READ_TEXT, () => clipboard.readText());

  register(
    IpcChannels.SHELL_OPEN_EXTERNAL,
    async (_event, urlUnknown): Promise<boolean> => {
      if (typeof urlUnknown !== "string" || !isAllowedExternalUrl(urlUnknown)) {
        log.warn(`[shell] blocked external open: ${String(urlUnknown)}`);
        return false;
      }
      await shell.openExternal(urlUnknown);
      return true;
    },
  );

  register(IpcChannels.SHELL_SHOW_ITEM, (_event, pathUnknown) => {
    if (typeof pathUnknown !== "string" || pathUnknown.length === 0) {
      throw new Error("path must be a non-empty string");
    }
    shell.showItemInFolder(pathUnknown);
  });

  register(
    IpcChannels.DOWNLOAD_START,
    async (_event, requestUnknown): Promise<DesktopDownloadResult> => {
      const request = requestUnknown as DesktopDownloadRequest;
      if (!request?.url || typeof request.url !== "string") {
        return { ok: false, error: "Invalid download URL" };
      }
      if (
        !request.url.startsWith("https://") &&
        !request.url.startsWith("http://")
      ) {
        return { ok: false, error: "Blocked download URL" };
      }
      return startDownload(request);
    },
  );

  register(
    IpcChannels.FILE_PICK,
    async (_event, optionsUnknown): Promise<DesktopFilePickResult> => {
      const options = (optionsUnknown ?? {}) as {
        multiSelections?: boolean;
        filters?: Array<{ name: string; extensions: string[] }>;
      };
      const win = requireMainWindow();
      const result = await dialog.showOpenDialog(win, {
        properties: options.multiSelections
          ? ["openFile", "multiSelections"]
          : ["openFile"],
        filters: options.filters,
      });
      return {
        canceled: result.canceled,
        filePaths: result.filePaths,
      };
    },
  );

  register(
    IpcChannels.UPDATE_CHECK,
    async (): Promise<DesktopUpdateStatus> => checkForUpdates(),
  );

  register(
    IpcChannels.UPDATE_GET_STATUS,
    (): DesktopUpdateStatus => getUpdateStatus(),
  );

  register(IpcChannels.DEEP_LINK_GET_PENDING, () => {
    const pending = getPendingDeepLink();
    if (pending) {
      consumePendingDeepLink();
    }
    return pending;
  });

  ipcMain.handle(
    "eliteflow:invoke",
    async (event, channelUnknown: unknown, ...args: unknown[]) => {
      if (typeof channelUnknown !== "string") {
        throw new Error("Invalid IPC channel");
      }
      const handler = handlers.get(channelUnknown);
      if (!handler) {
        log.warn(`[ipc] blocked unknown channel: ${channelUnknown}`);
        throw new Error(`IPC channel not allowed: ${channelUnknown}`);
      }

      const win = BrowserWindow.fromWebContents(event.sender);
      const main = getMainWindow();
      if (!win || !main || win.id !== main.id) {
        if (!isDev()) {
          throw new Error("IPC sender is not the main window");
        }
      }

      return handler(event, ...args);
    },
  );

  log.info(`[ipc] registered ${handlers.size} secure handlers`);
}
