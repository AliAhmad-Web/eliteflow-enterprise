export interface DesktopAppInfo {
  name: string;
  version: string;
  platform: NodeJS.Platform;
  arch: string;
  isPackaged: boolean;
  webUrl: string;
  apiUrl: string;
  electronVersion: string;
  chromeVersion: string;
}

export interface DesktopPaths {
  userData: string;
  downloads: string;
  temp: string;
  logs: string;
}

export interface DesktopNotificationPayload {
  title: string;
  body?: string;
  silent?: boolean;
  /** Optional in-app path or deep-link target when the user clicks the notification. */
  deepLink?: string;
}

export interface DesktopDownloadRequest {
  url: string;
  filename?: string;
}

export interface DesktopDownloadResult {
  ok: boolean;
  savePath?: string;
  error?: string;
}

export interface DesktopFilePickResult {
  canceled: boolean;
  filePaths: string[];
}

export interface DesktopUpdateStatus {
  prepared: boolean;
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  version?: string;
  error?: string;
  message: string;
}

export interface EliteFlowDesktopApi {
  getAppInfo: () => Promise<DesktopAppInfo>;
  getPaths: () => Promise<DesktopPaths>;
  minimize: () => Promise<void>;
  maximizeToggle: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  showNotification: (payload: DesktopNotificationPayload) => Promise<boolean>;
  writeClipboardText: (text: string) => Promise<void>;
  readClipboardText: () => Promise<string>;
  openExternal: (url: string) => Promise<boolean>;
  showItemInFolder: (fullPath: string) => Promise<void>;
  downloadFile: (request: DesktopDownloadRequest) => Promise<DesktopDownloadResult>;
  pickFiles: (options?: {
    multiSelections?: boolean;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<DesktopFilePickResult>;
  checkForUpdates: () => Promise<DesktopUpdateStatus>;
  getUpdateStatus: () => Promise<DesktopUpdateStatus>;
  getPendingDeepLink: () => Promise<string | null>;
  platform: "desktop";
}
