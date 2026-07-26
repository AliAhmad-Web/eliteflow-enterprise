export const MESSAGE_TYPES = {
  SESSION_CHANGED: "eliteflow/session-changed",
  OPEN_POPUP_VIEW: "eliteflow/open-popup-view",
  REFRESH_BADGE: "eliteflow/refresh-badge",
  GET_SESSION: "eliteflow/get-session",
  PING: "eliteflow/ping",
} as const;

export type PopupView =
  | "dashboard"
  | "ai"
  | "notifications"
  | "actions"
  | "create-task"
  | "create-note"
  | "search";

export type ExtensionMessage =
  | { type: typeof MESSAGE_TYPES.SESSION_CHANGED }
  | { type: typeof MESSAGE_TYPES.OPEN_POPUP_VIEW; view: PopupView }
  | { type: typeof MESSAGE_TYPES.REFRESH_BADGE }
  | { type: typeof MESSAGE_TYPES.GET_SESSION }
  | { type: typeof MESSAGE_TYPES.PING };

export function sendMessage(message: ExtensionMessage): Promise<unknown> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        void chrome.runtime.lastError;
        resolve(response);
      });
    } catch {
      resolve(undefined);
    }
  });
}
