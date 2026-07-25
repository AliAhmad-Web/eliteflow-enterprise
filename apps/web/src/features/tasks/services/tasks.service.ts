import {
  TASKS_API_PREFIX,
  type CreateTaskCommentInput,
  type CreateTaskInput,
  type ListTasksQueryInput,
  type Task,
  type TaskActivityDto,
  type TaskCommentDto,
  type TaskListResponse,
  type TaskStats,
  type UpdateTaskInput,
} from "@enterprise/shared";

import { apiRequest } from "@/services/api/api-client";

import type {
  TaskAssigneeOption,
  TaskProjectOption,
} from "../types/tasks.types";

function toQueryString(query: ListTasksQueryInput): string {
  const params = new URLSearchParams();

  if (query.search) {
    params.set("search", query.search);
  }
  if (query.status) {
    params.set("status", query.status);
  }
  if (query.priority) {
    params.set("priority", query.priority);
  }
  if (query.projectId) {
    params.set("projectId", query.projectId);
  }
  if (query.assignedToId) {
    params.set("assignedToId", query.assignedToId);
  }
  params.set("sortBy", query.sortBy);
  params.set("sortOrder", query.sortOrder);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export const tasksService = {
  list(query: ListTasksQueryInput) {
    return apiRequest<TaskListResponse>(
      `${TASKS_API_PREFIX}${toQueryString(query)}`,
      { auth: true },
    );
  },

  getStats() {
    return apiRequest<TaskStats>(`${TASKS_API_PREFIX}/stats`, {
      auth: true,
    });
  },

  listAssignees() {
    return apiRequest<TaskAssigneeOption[]>(`${TASKS_API_PREFIX}/assignees`, {
      auth: true,
    });
  },

  listProjects() {
    return apiRequest<TaskProjectOption[]>(`${TASKS_API_PREFIX}/projects`, {
      auth: true,
    });
  },

  getById(id: string) {
    return apiRequest<Task>(`${TASKS_API_PREFIX}/${id}`, { auth: true });
  },

  create(input: CreateTaskInput) {
    return apiRequest<Task>(TASKS_API_PREFIX, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  update(id: string, input: UpdateTaskInput) {
    return apiRequest<Task>(`${TASKS_API_PREFIX}/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  remove(id: string) {
    return apiRequest<{ id: string; message: string }>(
      `${TASKS_API_PREFIX}/${id}`,
      {
        method: "DELETE",
        auth: true,
      },
    );
  },

  addComment(id: string, input: CreateTaskCommentInput) {
    return apiRequest<TaskCommentDto>(`${TASKS_API_PREFIX}/${id}/comments`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  getActivity(id: string) {
    return apiRequest<TaskActivityDto[]>(`${TASKS_API_PREFIX}/${id}/activity`, {
      auth: true,
    });
  },
};
