import {
  PROJECTS_API_PREFIX,
  type CreateProjectInput,
  type ListProjectsQueryInput,
  type Project,
  type ProjectListResponse,
  type ProjectStats,
  type UpdateProjectInput,
} from "@enterprise/shared";

import { apiRequest } from "@/services/api/api-client";

import type { ProjectAssigneeOption } from "../types/projects.types";

function toQueryString(query: ListProjectsQueryInput): string {
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
  if (query.clientId) {
    params.set("clientId", query.clientId);
  }
  params.set("sortBy", query.sortBy);
  params.set("sortOrder", query.sortOrder);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export const projectsService = {
  list(query: ListProjectsQueryInput) {
    return apiRequest<ProjectListResponse>(
      `${PROJECTS_API_PREFIX}${toQueryString(query)}`,
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
      {
        method: "DELETE",
        auth: true,
      },
    );
  },
};
