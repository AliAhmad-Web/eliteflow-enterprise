import {
  PROJECTS_API_PREFIX,
  type CreateProjectInput,
  type ListProjectsQueryInput,
  type Project,
  type ProjectListResponse,
  type ProjectStats,
  type UpdateProjectInput,
} from "@enterprise/shared";

import { apiRequest } from "./api-client";
import { toQueryString } from "@/lib/utils";

export type ProjectAssigneeOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export const projectsService = {
  list(query: ListProjectsQueryInput) {
    return apiRequest<ProjectListResponse>(
      `${PROJECTS_API_PREFIX}${toQueryString({
        search: query.search || undefined,
        status: query.status,
        priority: query.priority,
        clientId: query.clientId,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        page: query.page,
        limit: query.limit,
      })}`,
      { auth: true },
    );
  },

  getStats() {
    return apiRequest<ProjectStats>(`${PROJECTS_API_PREFIX}/stats`, {
      auth: true,
    });
  },

  listAssignees() {
    return apiRequest<ProjectAssigneeOption[]>(
      `${PROJECTS_API_PREFIX}/assignees`,
      { auth: true },
    );
  },

  getById(id: string) {
    return apiRequest<Project>(`${PROJECTS_API_PREFIX}/${id}`, { auth: true });
  },

  create(input: CreateProjectInput) {
    return apiRequest<Project>(PROJECTS_API_PREFIX, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  update(id: string, input: UpdateProjectInput) {
    return apiRequest<Project>(`${PROJECTS_API_PREFIX}/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  remove(id: string) {
    return apiRequest<{ id: string; message: string }>(
      `${PROJECTS_API_PREFIX}/${id}`,
      { method: "DELETE", auth: true },
    );
  },
};
