/**
 * Secure IPC channel allowlist.
 * Only channels listed here may be invoked from the renderer via preload.
 */
export const IpcChannels = {
  APP_GET_INFO: "eliteflow:app:get-info",
  APP_GET_PATHS: "eliteflow:app:get-paths",
  WINDOW_MINIMIZE: "eliteflow:window:minimize",
  WINDOW_MAXIMIZE: "eliteflow:window:maximize",
  WINDOW_CLOSE: "eliteflow:window:close",
  WINDOW_IS_MAXIMIZED: "eliteflow:window:is-maximized",
  NOTIFICATION_SHOW: "eliteflow:notification:show",
  CLIPBOARD_WRITE_TEXT: "eliteflow:clipboard:write-text",
  CLIPBOARD_READ_TEXT: "eliteflow:clipboard:read-text",
  SHELL_OPEN_EXTERNAL: "eliteflow:shell:open-external",
  SHELL_SHOW_ITEM: "eliteflow:shell:show-item-in-folder",
  DOWNLOAD_START: "eliteflow:download:start",
  FILE_PICK: "eliteflow:file:pick",
  UPDATE_CHECK: "eliteflow:update:check",
  UPDATE_GET_STATUS: "eliteflow:update:get-status",
  DEEP_LINK_GET_PENDING: "eliteflow:deep-link:get-pending",
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];

export const ALLOWED_IPC_CHANNELS: ReadonlySet<string> = new Set(
  Object.values(IpcChannels),
);
