import {
  NOTIFICATIONS_API_PREFIX,
  type BulkNotificationIdsInput,
  type CreateNotificationReplyInput,
  type ListNotificationsQueryInput,
  type Notification,
  type NotificationHistoryResponse,
  type NotificationListResponse,
  type NotificationPreferenceListResponse,
  type NotificationReply,
  type NotificationReplyListResponse,
  type UnreadCount,
  type UpdatePreferencesBatchInput,
} from "@enterprise/shared";

import { apiRequest } from "@/services/api/api-client";

function toQueryString(query: ListNotificationsQueryInput): string {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 20));
  if (query.search) params.set("search", query.search);
  if (query.category) params.set("category", query.category);
  if (query.priority) params.set("priority", query.priority);
  if (query.isRead !== undefined) params.set("isRead", query.isRead);
  if (query.isArchived !== undefined) {
    params.set("isArchived", query.isArchived);
  }
  if (query.userId) params.set("userId", query.userId);
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export const notificationsService = {
  list(query: ListNotificationsQueryInput) {
    return apiRequest<NotificationListResponse>(
      `${NOTIFICATIONS_API_PREFIX}${toQueryString(query)}`,
      { auth: true },
    );
  },

  unreadCount() {
    return apiRequest<UnreadCount>(`${NOTIFICATIONS_API_PREFIX}/unread-count`, {
      auth: true,
    });
  },

  getById(id: string) {
    return apiRequest<Notification>(`${NOTIFICATIONS_API_PREFIX}/${id}`, {
      auth: true,
    });
  },

  markRead(id: string) {
    return apiRequest<{ count: number }>(
      `${NOTIFICATIONS_API_PREFIX}/${id}/read`,
      { method: "POST", auth: true },
    );
  },

  markAllRead() {
    return apiRequest<{ count: number }>(
      `${NOTIFICATIONS_API_PREFIX}/mark-all-read`,
      { method: "POST", auth: true },
    );
  },

  archive(id: string) {
    return apiRequest<{ count: number }>(
      `${NOTIFICATIONS_API_PREFIX}/${id}/archive`,
      { method: "POST", auth: true },
    );
  },

  remove(id: string) {
    return apiRequest<{ count: number }>(`${NOTIFICATIONS_API_PREFIX}/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },

  bulkRead(input: BulkNotificationIdsInput) {
    return apiRequest<{ count: number }>(
      `${NOTIFICATIONS_API_PREFIX}/bulk/read`,
      { method: "POST", body: input, auth: true },
    );
  },

  bulkArchive(input: BulkNotificationIdsInput) {
    return apiRequest<{ count: number }>(
      `${NOTIFICATIONS_API_PREFIX}/bulk/archive`,
      { method: "POST", body: input, auth: true },
    );
  },

  bulkDelete(input: BulkNotificationIdsInput) {
    return apiRequest<{ count: number }>(
      `${NOTIFICATIONS_API_PREFIX}/bulk/delete`,
      { method: "POST", body: input, auth: true },
    );
  },

  preferences() {
    return apiRequest<NotificationPreferenceListResponse>(
      `${NOTIFICATIONS_API_PREFIX}/preferences`,
      { auth: true },
    );
  },

  updatePreferences(input: UpdatePreferencesBatchInput) {
    return apiRequest<NotificationPreferenceListResponse>(
      `${NOTIFICATIONS_API_PREFIX}/preferences`,
      { method: "PUT", body: input, auth: true },
    );
  },

  history(page = 1, pageSize = 20) {
    return apiRequest<NotificationHistoryResponse>(
      `${NOTIFICATIONS_API_PREFIX}/history?page=${page}&pageSize=${pageSize}`,
      { auth: true },
    );
  },

  listReplies(notificationId: string) {
    return apiRequest<NotificationReplyListResponse>(
      `${NOTIFICATIONS_API_PREFIX}/${notificationId}/replies`,
      { auth: true },
    );
  },

  createReply(notificationId: string, input: CreateNotificationReplyInput) {
    return apiRequest<NotificationReply>(
      `${NOTIFICATIONS_API_PREFIX}/${notificationId}/replies`,
      { method: "POST", body: input, auth: true },
    );
  },

  deleteReply(notificationId: string, replyId: string) {
    return apiRequest<{ id: string }>(
      `${NOTIFICATIONS_API_PREFIX}/${notificationId}/replies/${replyId}`,
      { method: "DELETE", auth: true },
    );
  },
};
