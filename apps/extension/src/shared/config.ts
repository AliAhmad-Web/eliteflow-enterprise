/** Production EliteFlow Railway API — sole backend for this extension. */
export const API_BASE_URL =
  "https://api-production-a778.up.railway.app" as const;

/** Production EliteFlow Web client (open related pages). */
export const WEB_APP_URL = "https://eliteflow-web.vercel.app" as const;

export const EXTENSION_VERSION = "1.0.0" as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "eliteflow.accessToken",
  REFRESH_TOKEN: "eliteflow.refreshToken",
  CACHED_USER: "eliteflow.authUser",
  PENDING_AI_PROMPT: "eliteflow.pendingAiPrompt",
  PENDING_SAVE_PAGE: "eliteflow.pendingSavePage",
  LAST_UNREAD_COUNT: "eliteflow.lastUnreadCount",
  POPUP_VIEW: "eliteflow.popupView",
} as const;

export const ALARM_NAMES = {
  NOTIFICATION_POLL: "eliteflow.notificationPoll",
} as const;

export const CONTEXT_MENU_IDS = {
  SEND_TO_AI: "eliteflow.sendToAi",
  SAVE_TO_PROJECT: "eliteflow.saveToProject",
} as const;

export const WEB_ROUTES = {
  dashboard: "/dashboard",
  workspace: "/workspace",
  tasks: "/tasks",
  projects: "/projects",
  clients: "/clients",
  notifications: "/notifications",
  aiAssistant: "/ai-assistant",
  aiDocuments: "/ai-documents",
  team: "/team",
  login: "/login",
} as const;

export function webUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${WEB_APP_URL}${normalized}`;
}
