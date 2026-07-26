import { contextBridge, ipcRenderer } from "electron";

import { IpcChannels } from "../shared/channels";
import type {
  DesktopAppInfo,
  DesktopDownloadRequest,
  DesktopDownloadResult,
  DesktopFilePickResult,
  DesktopNotificationPayload,
  DesktopPaths,
  DesktopUpdateStatus,
  EliteFlowDesktopApi,
} from "../shared/types";

/**
 * Secure preload bridge.
 * Renderer never gets Node APIs — only this typed façade.
 */
async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke("eliteflow:invoke", channel, ...args) as Promise<T>;
}

const api: EliteFlowDesktopApi = {
  platform: "desktop",

  getAppInfo: () => invoke<DesktopAppInfo>(IpcChannels.APP_GET_INFO),
  getPaths: () => invoke<DesktopPaths>(IpcChannels.APP_GET_PATHS),

  minimize: () => invoke<void>(IpcChannels.WINDOW_MINIMIZE),
  maximizeToggle: () => invoke<void>(IpcChannels.WINDOW_MAXIMIZE),
  close: () => invoke<void>(IpcChannels.WINDOW_CLOSE),
  isMaximized: () => invoke<boolean>(IpcChannels.WINDOW_IS_MAXIMIZED),

  showNotification: (payload: DesktopNotificationPayload) =>
    invoke<boolean>(IpcChannels.NOTIFICATION_SHOW, payload),

  writeClipboardText: (text: string) =>
    invoke<void>(IpcChannels.CLIPBOARD_WRITE_TEXT, text),
  readClipboardText: () => invoke<string>(IpcChannels.CLIPBOARD_READ_TEXT),

  openExternal: (url: string) =>
    invoke<boolean>(IpcChannels.SHELL_OPEN_EXTERNAL, url),
  showItemInFolder: (fullPath: string) =>
    invoke<void>(IpcChannels.SHELL_SHOW_ITEM, fullPath),

  downloadFile: (request: DesktopDownloadRequest) =>
    invoke<DesktopDownloadResult>(IpcChannels.DOWNLOAD_START, request),

  pickFiles: (options) =>
    invoke<DesktopFilePickResult>(IpcChannels.FILE_PICK, options),

  checkForUpdates: () =>
    invoke<DesktopUpdateStatus>(IpcChannels.UPDATE_CHECK),
  getUpdateStatus: () =>
    invoke<DesktopUpdateStatus>(IpcChannels.UPDATE_GET_STATUS),

  getPendingDeepLink: () =>
    invoke<string | null>(IpcChannels.DEEP_LINK_GET_PENDING),
};

contextBridge.exposeInMainWorld("eliteflowDesktop", api);

declare global {
  interface Window {
    eliteflowDesktop?: EliteFlowDesktopApi;
  }
}
