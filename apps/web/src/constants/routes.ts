export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  VERIFY_EMAIL: "/verify-email",
  AUTH_CALLBACK: "/auth/callback",
  DOWNLOADS: "/downloads",
  DOWNLOADS_DESKTOP_GUIDE: "/downloads/desktop",
  DOWNLOADS_EXTENSION_GUIDE: "/downloads/extension",
  ADMIN: "/admin",
  PORTAL: "/portal",
  DASHBOARD: "/dashboard",
  WORKSPACE: "/workspace",
  CLIENTS: "/clients",
  PROJECTS: "/projects",
  TASKS: "/tasks",
  INVOICES: "/invoices",
  REPORTS: "/reports",
  CALENDAR: "/calendar",
  WHITEBOARD: "/whiteboard",
  AI_ASSISTANT: "/ai-assistant",
  AI_DOCUMENTS: "/ai-documents",
  FILE_MANAGER: "/file-manager",
  FILES: "/files",
  TEAM: "/team",
  NOTIFICATIONS: "/notifications",
  MESSAGES: "/messages",
  CHANNELS: "/channels",
  ANNOUNCEMENTS: "/announcements",
  THREADS: "/threads",
  MEETINGS: "/meetings",
  ACTIVITY: "/activity",
  VOICE_AI: "/voice-ai",
  WHATSAPP: "/whatsapp",
  EMAIL_AUTOMATION: "/email-automation",
  INTEGRATIONS: "/integrations",
  SETTINGS: "/settings",
  SETTINGS_SECURITY: "/settings/security",
  SETTINGS_SESSIONS: "/settings/security/sessions",
  PROFILE: "/profile",
  SECURITY: "/security",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

export function taskDetailPath(id: string): string {
  return `${ROUTES.TASKS}/${id}`;
}

export function invoiceDetailPath(id: string): string {
  return `${ROUTES.INVOICES}/${id}`;
}
