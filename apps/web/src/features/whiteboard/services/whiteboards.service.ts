import {
  WHITEBOARDS_API_PREFIX,
  type CreateWhiteboardCommentInput,
  type CreateWhiteboardInput,
  type DuplicateWhiteboardInput,
  type ListWhiteboardsQueryInput,
  type RenameWhiteboardInput,
  type UpdateWhiteboardInput,
  type WhiteboardAiRequestInput,
  type WhiteboardCommentDto,
  type WhiteboardDto,
  type WhiteboardListResponse,
  type WhiteboardVersionDto,
} from "@enterprise/shared";

import { apiRequest } from "@/services/api/api-client";

function toQueryString(query: ListWhiteboardsQueryInput): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.projectId) params.set("projectId", query.projectId);
  if (query.taskId) params.set("taskId", query.taskId);
  if (query.clientId) params.set("clientId", query.clientId);
  if (query.teamId) params.set("teamId", query.teamId);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export const whiteboardsService = {
  list(query: ListWhiteboardsQueryInput) {
    return apiRequest<WhiteboardListResponse>(
      `${WHITEBOARDS_API_PREFIX}${toQueryString(query)}`,
      { auth: true },
    );
  },

  getById(id: string) {
    return apiRequest<WhiteboardDto>(`${WHITEBOARDS_API_PREFIX}/${id}`, {
      auth: true,
    });
  },

  create(input: CreateWhiteboardInput) {
    return apiRequest<WhiteboardDto>(WHITEBOARDS_API_PREFIX, {
      method: "POST",
      auth: true,
      body: input,
    });
  },

  update(id: string, input: UpdateWhiteboardInput) {
    return apiRequest<WhiteboardDto>(`${WHITEBOARDS_API_PREFIX}/${id}`, {
      method: "PATCH",
      auth: true,
      body: input,
    });
  },

  rename(id: string, input: RenameWhiteboardInput) {
    return apiRequest<WhiteboardDto>(
      `${WHITEBOARDS_API_PREFIX}/${id}/rename`,
      { method: "POST", auth: true, body: input },
    );
  },

  duplicate(id: string, input: DuplicateWhiteboardInput = {}) {
    return apiRequest<WhiteboardDto>(
      `${WHITEBOARDS_API_PREFIX}/${id}/duplicate`,
      { method: "POST", auth: true, body: input },
    );
  },

  remove(id: string) {
    return apiRequest<{ id: string }>(`${WHITEBOARDS_API_PREFIX}/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },

  listVersions(id: string) {
    return apiRequest<WhiteboardVersionDto[]>(
      `${WHITEBOARDS_API_PREFIX}/${id}/versions`,
      { auth: true },
    );
  },

  restoreVersion(id: string, version: number) {
    return apiRequest<WhiteboardDto>(
      `${WHITEBOARDS_API_PREFIX}/${id}/versions/${version}/restore`,
      { method: "POST", auth: true },
    );
  },

  runAi(id: string, input: WhiteboardAiRequestInput) {
    return apiRequest<{ action: string; result: string }>(
      `${WHITEBOARDS_API_PREFIX}/${id}/ai`,
      { method: "POST", auth: true, body: input },
    );
  },

  listComments(id: string) {
    return apiRequest<WhiteboardCommentDto[]>(
      `${WHITEBOARDS_API_PREFIX}/${id}/comments`,
      { auth: true },
    );
  },

  addComment(id: string, input: CreateWhiteboardCommentInput) {
    return apiRequest<WhiteboardCommentDto>(
      `${WHITEBOARDS_API_PREFIX}/${id}/comments`,
      { method: "POST", auth: true, body: input },
    );
  },
};
