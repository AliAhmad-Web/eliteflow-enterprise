"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  ListNotificationsQueryInput,
  ListQueueQueryInput,
} from "@enterprise/shared";

import { notificationsService } from "../services/notifications.service";
import { NOTIFICATIONS_QUERY_KEYS } from "../types/notifications.types";

export function useNotifications(
  query: ListNotificationsQueryInput,
  enabled = true,
) {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.list(query),
    queryFn: () => notificationsService.list(query),
    enabled,
  });
}

export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.unread(),
    queryFn: () => notificationsService.unreadCount(),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useNotificationPreferences(enabled = true) {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.preferences(),
    queryFn: () => notificationsService.preferences(),
    enabled,
  });
}

export function useNotificationHistory(page = 1, enabled = true) {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.history(page),
    queryFn: () => notificationsService.history(page, 30),
    enabled,
  });
}

export function useNotificationTemplates(enabled = true) {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.templates(),
    queryFn: () => notificationsService.listTemplates(),
    enabled,
  });
}

export function useNotificationQueue(
  query: Partial<ListQueueQueryInput>,
  enabled = true,
) {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.queue(query as Record<string, unknown>),
    queryFn: () => notificationsService.listQueue(query),
    enabled,
    refetchInterval: enabled ? 15_000 : false,
  });
}

export function useNotification(
  id: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.detail(id ?? "none"),
    queryFn: () => notificationsService.getById(id!),
    enabled: Boolean(id) && enabled,
  });
}

/** Lazy-loaded replies with polling for live updates while the panel is open. */
export function useNotificationReplies(
  notificationId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.replies(notificationId ?? "none"),
    queryFn: () => notificationsService.listReplies(notificationId!),
    enabled: Boolean(notificationId) && enabled,
    refetchInterval: enabled && notificationId ? 12_000 : false,
  });
}
