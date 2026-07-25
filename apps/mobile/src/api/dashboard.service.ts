import {
  CALENDAR_API_PREFIX,
  NOTIFICATIONS_API_PREFIX,
  PROJECTS_API_PREFIX,
  REPORTS_API_PREFIX,
  TASKS_API_PREFIX,
  type AnalyticsDashboardDto,
  type Notification,
  type ProjectStats,
  type TaskStats,
  type UnreadCount,
  type UpcomingEventsResponse,
} from "@enterprise/shared";

import { apiRequest } from "./api-client";

export const dashboardService = {
  getAnalytics() {
    return apiRequest<AnalyticsDashboardDto>(
      `${REPORTS_API_PREFIX}/analytics`,
      { auth: true },
    );
  },

  getProjectStats() {
    return apiRequest<ProjectStats>(`${PROJECTS_API_PREFIX}/stats`, {
      auth: true,
    });
  },

  getTaskStats() {
    return apiRequest<TaskStats>(`${TASKS_API_PREFIX}/stats`, { auth: true });
  },

  getUpcomingEvents() {
    return apiRequest<UpcomingEventsResponse>(
      `${CALENDAR_API_PREFIX}/upcoming`,
      { auth: true },
    );
  },
};

export const notificationsService = {
  list(params?: { page?: number; pageSize?: number }) {
    const search = new URLSearchParams();
    search.set("page", String(params?.page ?? 1));
    search.set("pageSize", String(params?.pageSize ?? 20));
    return apiRequest<{
      items: Notification[];
      total: number;
      page: number;
      pageSize: number;
      unreadCount: number;
    }>(`${NOTIFICATIONS_API_PREFIX}?${search.toString()}`, { auth: true });
  },

  unreadCount() {
    return apiRequest<UnreadCount>(
      `${NOTIFICATIONS_API_PREFIX}/unread-count`,
      { auth: true },
    );
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
};
