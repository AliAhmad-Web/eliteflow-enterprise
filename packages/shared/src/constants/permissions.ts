/**
 * Canonical permission keys — single source of truth for the Permission Engine.
 * Mirrors seeded keys in packages/database (do not hardcode elsewhere).
 */

export const PERMISSIONS = {
  SYSTEM_MANAGE: "system:manage",
  ADMIN_ACCESS: "admin:access",
  AUDIT_READ: "audit:read",
  SECURITY_MANAGE: "security:manage",
  SETTINGS_MANAGE: "settings:manage",
  INTEGRATIONS_READ: "integrations:read",
  INTEGRATIONS_MANAGE: "integrations:manage",
  USERS_MANAGE: "users:manage",
  TEAM_MANAGE: "team:manage",
  TEAM_READ: "team:read",

  CLIENTS_READ: "clients:read",
  CLIENTS_WRITE: "clients:write",
  CLIENTS_DELETE: "clients:delete",

  PROJECTS_READ: "projects:read",
  PROJECTS_WRITE: "projects:write",
  PROJECTS_DELETE: "projects:delete",

  TASKS_READ: "tasks:read",
  TASKS_WRITE: "tasks:write",
  TASKS_DELETE: "tasks:delete",

  INVOICES_READ: "invoices:read",
  INVOICES_WRITE: "invoices:write",
  INVOICES_SEND: "invoices:send",
  INVOICES_DELETE: "invoices:delete",

  REPORTS_READ: "reports:read",
  REPORTS_EXPORT: "reports:export",

  CALENDAR_READ: "calendar:read",
  CALENDAR_WRITE: "calendar:write",

  FILES_READ: "files:read",
  FILES_UPLOAD: "files:upload",
  FILES_DELETE: "files:delete",

  AI_USE: "ai:use",
  NOTIFICATIONS_READ: "notifications:read",
  CHAT_READ: "chat:read",
  CHAT_WRITE: "chat:write",

  WHITEBOARDS_READ: "whiteboards:read",
  WHITEBOARDS_WRITE: "whiteboards:write",
  WHITEBOARDS_DELETE: "whiteboards:delete",

  /** Phase 20 — Enterprise Communication Hub */
  COMMUNICATION_READ: "communication:read",
  COMMUNICATION_WRITE: "communication:write",
  COMMUNICATION_MANAGE: "communication:manage",
  ANNOUNCEMENT_MANAGE: "announcement:manage",
  MEETING_MANAGE: "meeting:manage",
  THREAD_MANAGE: "thread:manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_KEYS = Object.values(PERMISSIONS);

/**
 * Module → required permission for module-level access.
 */
export const MODULE_PERMISSIONS = {
  admin: PERMISSIONS.ADMIN_ACCESS,
  system: PERMISSIONS.SYSTEM_MANAGE,
  audit: PERMISSIONS.AUDIT_READ,
  security: PERMISSIONS.AUDIT_READ,
  settings: PERMISSIONS.SETTINGS_MANAGE,
  integrations: PERMISSIONS.INTEGRATIONS_READ,
  users: PERMISSIONS.USERS_MANAGE,
  team: PERMISSIONS.TEAM_READ,
  clients: PERMISSIONS.CLIENTS_READ,
  projects: PERMISSIONS.PROJECTS_READ,
  tasks: PERMISSIONS.TASKS_READ,
  invoices: PERMISSIONS.INVOICES_READ,
  billing: PERMISSIONS.INVOICES_READ,
  reports: PERMISSIONS.REPORTS_READ,
  calendar: PERMISSIONS.CALENDAR_READ,
  files: PERMISSIONS.FILES_READ,
  ai: PERMISSIONS.AI_USE,
  notifications: PERMISSIONS.NOTIFICATIONS_READ,
  chat: PERMISSIONS.CHAT_READ,
  communication: PERMISSIONS.COMMUNICATION_READ,
  whiteboards: PERMISSIONS.WHITEBOARDS_READ,
  portal: PERMISSIONS.PROJECTS_READ,
  dashboard: PERMISSIONS.PROJECTS_READ,
} as const;

export type ModuleKey = keyof typeof MODULE_PERMISSIONS;

/**
 * Route path prefixes → permission required to access the route.
 */
export const ROUTE_PERMISSIONS: Record<string, PermissionKey> = {
  "/admin": PERMISSIONS.ADMIN_ACCESS,
  "/dashboard": PERMISSIONS.PROJECTS_READ,
  "/workspace": PERMISSIONS.TASKS_READ,
  "/portal": PERMISSIONS.PROJECTS_READ,
  "/clients": PERMISSIONS.CLIENTS_READ,
  "/projects": PERMISSIONS.PROJECTS_READ,
  "/tasks": PERMISSIONS.TASKS_READ,
  "/invoices": PERMISSIONS.INVOICES_READ,
  "/reports": PERMISSIONS.REPORTS_READ,
  "/calendar": PERMISSIONS.CALENDAR_READ,
  "/whiteboard": PERMISSIONS.WHITEBOARDS_READ,
  "/file-manager": PERMISSIONS.FILES_READ,
  "/ai-assistant": PERMISSIONS.AI_USE,
  "/ai-documents": PERMISSIONS.AI_USE,
  "/team": PERMISSIONS.TEAM_READ,
  "/notifications": PERMISSIONS.NOTIFICATIONS_READ,
  "/messages": PERMISSIONS.COMMUNICATION_READ,
  "/channels": PERMISSIONS.COMMUNICATION_READ,
  "/announcements": PERMISSIONS.COMMUNICATION_READ,
  "/threads": PERMISSIONS.COMMUNICATION_READ,
  "/meetings": PERMISSIONS.COMMUNICATION_READ,
  "/activity": PERMISSIONS.COMMUNICATION_READ,
  // /integrations — all signed-in roles may open Integration Center;
  // visibility of individual integrations is enforced in the API service.
  // /security is available to every signed-in user (own sessions/password).
  // Org-wide audit APIs remain gated by audit:read.
  // Account settings (sessions, security) are available to every signed-in user.
  // Org-wide settings:manage remains a separate permission for future admin config.
};
