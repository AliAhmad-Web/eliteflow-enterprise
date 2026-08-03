import {
  NOTIFICATIONS_API_PREFIX,
  type BulkNotificationIdsInput,
  type CreateNotificationInput,
  type CreateNotificationReplyInput,
  type ListNotificationsQueryInput,
  type ListQueueQueryInput,
  type Notification,
  type NotificationHistoryResponse,
  type NotificationListResponse,
  type NotificationPreferenceListResponse,
  type NotificationQueueListResponse,
  type NotificationReply,
  type NotificationReplyListResponse,
  type NotificationTemplateListResponse,
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

function toQueueQueryString(query: {
  page?: number;
  pageSize?: number;
  status?: ListQueueQueryInput["status"];
  channel?: ListQueueQueryInput["channel"];
}): string {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 20));
  if (query.status) params.set("status", query.status);
  if (query.channel) params.set("channel", query.channel);
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

  listTemplates() {
    return apiRequest<NotificationTemplateListResponse>(
      `${NOTIFICATIONS_API_PREFIX}/templates`,
      { auth: true },
    );
  },

  listQueue(query: Partial<ListQueueQueryInput> = {}) {
    return apiRequest<NotificationQueueListResponse>(
      `${NOTIFICATIONS_API_PREFIX}/queue${toQueueQueryString({
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        status: query.status,
        channel: query.channel,
      })}`,
      { auth: true },
    );
  },

  processQueue() {
    return apiRequest<{ processed: number; sent: number; failed: number }>(
      `${NOTIFICATIONS_API_PREFIX}/queue/process`,
      { method: "POST", auth: true },
    );
  },

  create(input: CreateNotificationInput) {
    return apiRequest<{ created: number; queued: number }>(
      `${NOTIFICATIONS_API_PREFIX}`,
      { method: "POST", body: input, auth: true },
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
