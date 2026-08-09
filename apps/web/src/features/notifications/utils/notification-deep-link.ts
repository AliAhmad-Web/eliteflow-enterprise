import type { Notification } from "@enterprise/shared";

import { ROUTES, invoiceDetailPath, taskDetailPath } from "@/constants/routes";

import {
  DEEP_LINK_PARAMS,
  type DeepLinkActionType,
} from "./deep-link-params";

export {
  DEEP_LINK_PARAMS,
  parseDeepLinkSearchParams,
  stripDeepLinkSearchParams,
  type DeepLinkActionType,
} from "./deep-link-params";

export type DeepLinkSourceModule =
  | "notifications"
  | "tasks"
  | "projects"
  | "invoices"
  | "calendar"
  | "clients"
  | "files"
  | "ai"
  | "team"
  | "system";

export interface NotificationDeepLinkContext {
  entityType: string | null;
  entityId: string | null;
  actionType: DeepLinkActionType;
  sourceModule: DeepLinkSourceModule;
  targetRoute: string;
  notificationId: string;
  highlight: boolean;
}

function moduleFromCategory(category: Notification["category"]): DeepLinkSourceModule {
  switch (category) {
    case "TASK":
      return "tasks";
    case "PROJECT":
      return "projects";
    case "INVOICE":
      return "invoices";
    case "CALENDAR":
      return "calendar";
    case "FILE":
      return "files";
    case "AI":
      return "ai";
    case "TEAM":
      return "team";
    case "SYSTEM":
    case "SECURITY":
    case "AUTH":
      return "system";
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}

function baseRouteForNotification(notification: Notification): string | null {
  const entityType = (notification.entityType ?? "").toLowerCase();
  const entityId = notification.entityId;

  if (entityId) {
    if (entityType.includes("task") || notification.category === "TASK") {
      return taskDetailPath(entityId);
    }
    if (entityType.includes("project") || notification.category === "PROJECT") {
      return ROUTES.PROJECTS;
    }
    if (entityType.includes("invoice") || notification.category === "INVOICE") {
      return invoiceDetailPath(entityId);
    }
    if (
      entityType.includes("calendar") ||
      entityType.includes("event") ||
      notification.category === "CALENDAR"
    ) {
      return ROUTES.CALENDAR;
    }
    if (entityType.includes("client") || entityType.includes("company")) {
      return ROUTES.CLIENTS;
    }
    if (entityType.includes("file") || notification.category === "FILE") {
      return `${ROUTES.FILES}/${entityId}`;
    }
    if (
      entityType.includes("ai") ||
      entityType.includes("document") ||
      notification.category === "AI"
    ) {
      return ROUTES.AI_DOCUMENTS;
    }
  }

  switch (notification.category) {
    case "TASK":
      return ROUTES.TASKS;
    case "PROJECT":
      return ROUTES.PROJECTS;
    case "INVOICE":
      return ROUTES.INVOICES;
    case "CALENDAR":
      return ROUTES.CALENDAR;
    case "FILE":
      return ROUTES.FILE_MANAGER;
    case "AI":
      return ROUTES.AI_DOCUMENTS;
    case "TEAM":
      return ROUTES.TEAM;
    case "SYSTEM":
    case "SECURITY":
    case "AUTH":
      return null;
    default: {
      const _exhaustive: never = notification.category;
      return _exhaustive;
    }
  }
}

/**
 * Builds a query-param deep link that destination pages consume to open the
 * exact record (never a bare list).
 */
export function buildEntityDeepLink(
  notification: Notification,
  options?: { actionType?: DeepLinkActionType },
): string | null {
  const entityId = notification.entityId;
  if (!entityId) {
    // Fall back to stored linkUrl only when it already includes a record focus param.
    if (notification.linkUrl?.includes("?")) return notification.linkUrl;
    if (notification.linkUrl?.match(/\/[0-9a-f-]{36}/i)) {
      // Keep path-based task/invoice detail links and attach notification context.
      const match = notification.linkUrl.match(
        /^(\/(?:tasks|invoices))\/([0-9a-f-]{36})/i,
      );
      if (match) {
        const base = match[1];
        const id = match[2];
        const params = new URLSearchParams({
          [DEEP_LINK_PARAMS.FROM]: "notification",
          [DEEP_LINK_PARAMS.NOTIFICATION_ID]: notification.id,
          [DEEP_LINK_PARAMS.ACTION]: options?.actionType ?? "view",
          [DEEP_LINK_PARAMS.HIGHLIGHT]: "1",
          [DEEP_LINK_PARAMS.SOURCE]: moduleFromCategory(notification.category),
        });
        return `${base}/${id}?${params.toString()}`;
      }
      const legacy = notification.linkUrl.match(
        /^(\/(?:projects|clients))\/([0-9a-f-]{36})/i,
      );
      if (legacy) {
        const base = legacy[1];
        const id = legacy[2];
        const params = new URLSearchParams({
          [DEEP_LINK_PARAMS.OPEN]: id,
          [DEEP_LINK_PARAMS.FROM]: "notification",
          [DEEP_LINK_PARAMS.NOTIFICATION_ID]: notification.id,
          [DEEP_LINK_PARAMS.ACTION]: options?.actionType ?? "view",
          [DEEP_LINK_PARAMS.HIGHLIGHT]: "1",
          [DEEP_LINK_PARAMS.SOURCE]: moduleFromCategory(notification.category),
        });
        return `${base}?${params.toString()}`;
      }
      return notification.linkUrl;
    }
    return notification.linkUrl;
  }

  const base = baseRouteForNotification(notification);
  if (!base) return notification.linkUrl;

  // Task / invoice detail pages are path-based (like files).
  if (base.startsWith(`${ROUTES.TASKS}/`) || base.startsWith(`${ROUTES.INVOICES}/`)) {
    const params = new URLSearchParams({
      [DEEP_LINK_PARAMS.FROM]: "notification",
      [DEEP_LINK_PARAMS.NOTIFICATION_ID]: notification.id,
      [DEEP_LINK_PARAMS.ACTION]: options?.actionType ?? "view",
      [DEEP_LINK_PARAMS.HIGHLIGHT]: "1",
      [DEEP_LINK_PARAMS.SOURCE]: moduleFromCategory(notification.category),
    });
    return `${base}?${params.toString()}`;
  }

  const params = new URLSearchParams({
    [DEEP_LINK_PARAMS.OPEN]: entityId,
    [DEEP_LINK_PARAMS.FROM]: "notification",
    [DEEP_LINK_PARAMS.NOTIFICATION_ID]: notification.id,
    [DEEP_LINK_PARAMS.ACTION]: options?.actionType ?? "view",
    [DEEP_LINK_PARAMS.HIGHLIGHT]: "1",
    [DEEP_LINK_PARAMS.SOURCE]: moduleFromCategory(notification.category),
  });

  // Calendar historically used alternate param names — include both.
  if (base === ROUTES.CALENDAR) params.set("event", entityId);
  if (base === ROUTES.AI_DOCUMENTS) params.set("id", entityId);

  // Full-page file viewer — path already includes the id.
  if (base.startsWith(`${ROUTES.FILES}/`)) {
    return `${base}?${params.toString()}`;
  }

  if (base === ROUTES.FILE_MANAGER) {
    return `${ROUTES.FILES}/${entityId}?${params.toString()}`;
  }

  return `${base}?${params.toString()}`;
}

export function buildNotificationPermalink(notificationId: string): string {
  return `${ROUTES.NOTIFICATIONS}/${notificationId}`;
}

export function buildDeepLinkContext(
  notification: Notification,
  actionType: DeepLinkActionType = "view",
): NotificationDeepLinkContext | null {
  const targetRoute = buildEntityDeepLink(notification, { actionType });
  if (!targetRoute) return null;
  return {
    entityType: notification.entityType,
    entityId: notification.entityId,
    actionType,
    sourceModule: "notifications",
    targetRoute,
    notificationId: notification.id,
    highlight: true,
  };
}
