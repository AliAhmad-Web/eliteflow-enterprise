import {
  AI_API_PREFIX,
  CLIENTS_API_PREFIX,
  NOTIFICATIONS_API_PREFIX,
  PROJECTS_API_PREFIX,
  TASKS_API_PREFIX,
  TEAM_API_PREFIX,
  type AiChatRequestInput,
  type AiChatResponseDto,
  type AiDocument,
  type Client,
  type CreateAiDocumentInput,
  type CreateTaskInput,
  type NotificationDto,
  type Project,
  type Task,
} from "@enterprise/shared";

import { apiRequest } from "./api-client";
import { toQueryString } from "./api-error";

type Paginated<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type NotificationListResponse = {
  items: NotificationDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type LeaveRequest = {
  id: string;
  status: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  reason?: string | null;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

export const dashboardService = {
  async getTodaysTasks(userId: string): Promise<Task[]> {
    const data = await apiRequest<Paginated<Task>>(
      `${TASKS_API_PREFIX}${toQueryString({
        assignedToId: userId,
        sortBy: "dueDate",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      })}`,
      { auth: true },
    );

    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    return data.items.filter((task) => {
      if (!task.dueDate) return false;
      if (task.status === "COMPLETED") return false;
      const due = new Date(task.dueDate);
      return due >= start && due <= end;
    });
  },

  async getRecentProjects(): Promise<Project[]> {
    const data = await apiRequest<Paginated<Project>>(
      `${PROJECTS_API_PREFIX}${toQueryString({
        sortBy: "updatedAt",
        sortOrder: "desc",
        page: 1,
        limit: 5,
      })}`,
      { auth: true },
    );
    return data.items;
  },

  async getPendingApprovals(): Promise<LeaveRequest[]> {
    try {
      const data = await apiRequest<Paginated<LeaveRequest>>(
        `${TEAM_API_PREFIX}/leaves${toQueryString({
          status: "PENDING",
          page: 1,
          limit: 10,
        })}`,
        { auth: true },
      );
      return data.items;
    } catch {
      return [];
    }
  },

  async getUnreadCount(): Promise<number> {
    const data = await apiRequest<{ count: number }>(
      `${NOTIFICATIONS_API_PREFIX}/unread-count`,
      { auth: true },
    );
    return data.count;
  },

  async getUnreadNotifications(limit = 10): Promise<NotificationDto[]> {
    const data = await apiRequest<NotificationListResponse>(
      `${NOTIFICATIONS_API_PREFIX}${toQueryString({
        isRead: false,
        page: 1,
        pageSize: limit,
      })}`,
      { auth: true },
    );
    return data.items;
  },
};

export const tasksService = {
  create(input: CreateTaskInput) {
    return apiRequest<Task>(TASKS_API_PREFIX, {
      method: "POST",
      body: input,
      auth: true,
    });
  },
};

export const projectsService = {
  search(query: string) {
    return apiRequest<Paginated<Project>>(
      `${PROJECTS_API_PREFIX}${toQueryString({
        search: query,
        page: 1,
        limit: 10,
      })}`,
      { auth: true },
    );
  },
};

export const clientsService = {
  search(query: string) {
    return apiRequest<Paginated<Client>>(
      `${CLIENTS_API_PREFIX}${toQueryString({
        search: query,
        page: 1,
        limit: 10,
      })}`,
      { auth: true },
    );
  },
};

export const notificationsService = {
  listUnread(pageSize = 20) {
    return apiRequest<NotificationListResponse>(
      `${NOTIFICATIONS_API_PREFIX}${toQueryString({
        isRead: false,
        page: 1,
        pageSize,
      })}`,
      { auth: true },
    );
  },

  markRead(id: string) {
    return apiRequest<{ id: string }>(
      `${NOTIFICATIONS_API_PREFIX}/${id}/read`,
      { method: "POST", auth: true },
    );
  },

  unreadCount() {
    return dashboardService.getUnreadCount();
  },
};

export const aiService = {
  chat(input: AiChatRequestInput) {
    return apiRequest<AiChatResponseDto>(`${AI_API_PREFIX}/chat`, {
      method: "POST",
      body: input,
      auth: true,
      timeoutMs: 120_000,
    });
  },

  createDocument(input: CreateAiDocumentInput) {
    return apiRequest<AiDocument>(`${AI_API_PREFIX}/documents`, {
      method: "POST",
      body: input,
      auth: true,
      timeoutMs: 120_000,
    });
  },
};
