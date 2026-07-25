"use client";

import { useQuery } from "@tanstack/react-query";
import type { ListNotificationsQueryInput } from "@enterprise/shared";

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

export function useNotificationHistory(enabled = true) {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.history(),
    queryFn: () => notificationsService.history(),
    enabled,
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
