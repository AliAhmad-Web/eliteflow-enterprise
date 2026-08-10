import {
  WHITEBOARDS_API_PREFIX,
  type ListWhiteboardsQueryInput,
  type WhiteboardDto,
  type WhiteboardListResponse,
} from "@enterprise/shared";

import { apiRequest } from "./api-client";
import { toQueryString } from "@/lib/utils";

export const whiteboardsService = {
  list(query: ListWhiteboardsQueryInput) {
    return apiRequest<WhiteboardListResponse>(
      `${WHITEBOARDS_API_PREFIX}${toQueryString({
        search: query.search || undefined,
        projectId: query.projectId,
        taskId: query.taskId,
        clientId: query.clientId,
        teamId: query.teamId,
        page: query.page,
        limit: query.limit,
      })}`,
      { auth: true },
    );
  },

  getById(id: string) {
    return apiRequest<WhiteboardDto>(`${WHITEBOARDS_API_PREFIX}/${id}`, {
      auth: true,
    });
  },
};
