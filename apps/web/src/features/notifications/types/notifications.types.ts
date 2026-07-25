import type {
  ListNotificationsQueryInput,
  Notification,
  NotificationCategoryValue,
  NotificationPreference,
} from "@enterprise/shared";

export const NOTIFICATIONS_QUERY_KEYS = {
  all: ["notifications"] as const,
  list: (query: ListNotificationsQueryInput) =>
    ["notifications", "list", query] as const,
  unread: () => ["notifications", "unread"] as const,
  preferences: () => ["notifications", "preferences"] as const,
  detail: (id: string) => ["notifications", "detail", id] as const,
  history: () => ["notifications", "history"] as const,
  replies: (id: string) => ["notifications", "replies", id] as const,
};

export const CATEGORY_LABELS: Record<NotificationCategoryValue, string> = {
  SYSTEM: "System",
  SECURITY: "Security",
  TASK: "Tasks",
  PROJECT: "Projects",
  INVOICE: "Invoices",
  CALENDAR: "Calendar",
  FILE: "Files",
  TEAM: "Team",
  AI: "AI",
  AUTH: "Auth",
};

export type NotificationTab =
  | "all"
  | NotificationCategoryValue
  | "archived";

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export type { Notification, NotificationPreference, ListNotificationsQueryInput };
