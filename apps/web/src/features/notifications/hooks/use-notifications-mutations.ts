"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdatePreferencesBatchInput } from "@enterprise/shared";

import { notificationsService } from "../services/notifications.service";
import { NOTIFICATIONS_QUERY_KEYS } from "../types/notifications.types";

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEYS.all });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useArchiveNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsService.archive(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsService.remove(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useBulkReadNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => notificationsService.bulkRead({ ids }),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useBulkArchiveNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => notificationsService.bulkArchive({ ids }),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useBulkDeleteNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => notificationsService.bulkDelete({ ids }),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePreferencesBatchInput) =>
      notificationsService.updatePreferences(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_QUERY_KEYS.preferences(),
      });
    },
  });
}

export function useCreateNotificationReply(notificationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      notificationsService.createReply(notificationId, {
        message,
        syncToEntity: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_QUERY_KEYS.replies(notificationId),
      });
    },
  });
}

export function useDeleteNotificationReply(notificationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (replyId: string) =>
      notificationsService.deleteReply(notificationId, replyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_QUERY_KEYS.replies(notificationId),
      });
    },
  });
}
