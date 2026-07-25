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

import { apiRequest } from "./api-client";
import { toQueryString } from "@/lib/utils";

export type TaskAssigneeOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type TaskProjectOption = {
  id: string;
  name: string;
};

export const tasksService = {
  list(query: ListTasksQueryInput) {
    return apiRequest<TaskListResponse>(
      `${TASKS_API_PREFIX}${toQueryString({
        search: query.search || undefined,
        status: query.status,
        priority: query.priority,
        projectId: query.projectId,
        assignedToId: query.assignedToId,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        page: query.page,
        limit: query.limit,
      })}`,
      { auth: true },
    );
  },

  getStats() {
    return apiRequest<TaskStats>(`${TASKS_API_PREFIX}/stats`, { auth: true });
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
      { method: "DELETE", auth: true },
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
