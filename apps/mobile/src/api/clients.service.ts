import {
  CLIENTS_API_PREFIX,
  type Client,
  type ClientActivityDto,
  type ClientListResponse,
  type ClientPipelineBoardDto,
  type CreateClientActivityInput,
  type CreateClientInput,
  type ListClientActivitiesQueryInput,
  type ListClientsQueryInput,
  type UpdateClientInput,
} from "@enterprise/shared";

import { apiRequest } from "./api-client";
import { toQueryString } from "@/lib/utils";

export const clientsService = {
  list(query: ListClientsQueryInput) {
    return apiRequest<ClientListResponse>(
      `${CLIENTS_API_PREFIX}${toQueryString({
        search: query.search || undefined,
        status: query.status,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        page: query.page,
        limit: query.limit,
      })}`,
      { auth: true },
    );
  },

  getStats() {
    return apiRequest<{
      total: number;
      active: number;
      leads: number;
      inactive: number;
    }>(`${CLIENTS_API_PREFIX}/stats`, { auth: true });
  },

  getPipelineBoard() {
    return apiRequest<ClientPipelineBoardDto>(`${CLIENTS_API_PREFIX}/pipeline`, {
      auth: true,
    });
  },

  getById(id: string) {
    return apiRequest<Client>(`${CLIENTS_API_PREFIX}/${id}`, { auth: true });
  },

  create(input: CreateClientInput) {
    return apiRequest<Client>(CLIENTS_API_PREFIX, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  update(id: string, input: UpdateClientInput) {
    return apiRequest<Client>(`${CLIENTS_API_PREFIX}/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  remove(id: string) {
    return apiRequest<{ id: string; message: string }>(
      `${CLIENTS_API_PREFIX}/${id}`,
      { method: "DELETE", auth: true },
    );
  },

  listActivities(id: string, query: ListClientActivitiesQueryInput) {
    return apiRequest<{
      items: ClientActivityDto[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        timestamp: string;
      };
    }>(
      `${CLIENTS_API_PREFIX}/${id}/activities${toQueryString({
        page: query.page,
        limit: query.limit,
      })}`,
      { auth: true },
    );
  },

  createActivity(id: string, input: CreateClientActivityInput) {
    return apiRequest<ClientActivityDto>(
      `${CLIENTS_API_PREFIX}/${id}/activities`,
      {
        method: "POST",
        body: input,
        auth: true,
      },
    );
  },

  deleteActivity(id: string, activityId: string) {
    return apiRequest<{ id: string }>(
      `${CLIENTS_API_PREFIX}/${id}/activities/${activityId}`,
      { method: "DELETE", auth: true },
    );
  },
};
