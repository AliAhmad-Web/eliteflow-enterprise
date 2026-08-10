import {
  CLIENTS_API_PREFIX,
  type Client,
  type ClientActivityDto,
  type ClientListResponse,
  type ClientPipelineBoardDto,
  type ClientPipelineStageValue,
  type CreateClientActivityInput,
  type CreateClientInput,
  type LinkPortalUserInput,
  type ListClientActivitiesQueryInput,
  type ListClientsQueryInput,
  type ListUnlinkedPortalUsersQueryInput,
  type PortalUserDto,
  type UpdateClientInput,
} from "@enterprise/shared";

import { apiRequest } from "@/services/api/api-client";

function toQueryString(query: ListClientsQueryInput): string {
  const params = new URLSearchParams();

  if (query.search) {
    params.set("search", query.search);
  }
  if (query.status) {
    params.set("status", query.status);
  }
  if (query.pipelineStage) {
    params.set("pipelineStage", query.pipelineStage);
  }
  params.set("sortBy", query.sortBy);
  params.set("sortOrder", query.sortOrder);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function toActivitiesQueryString(query: ListClientActivitiesQueryInput): string {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function toUnlinkedQueryString(
  query: ListUnlinkedPortalUsersQueryInput,
): string {
  const params = new URLSearchParams();
  if (query.search) {
    params.set("search", query.search);
  }
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export const clientsService = {
  list(query: ListClientsQueryInput) {
    return apiRequest<ClientListResponse>(
      `${CLIENTS_API_PREFIX}${toQueryString(query)}`,
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
      {
        method: "DELETE",
        auth: true,
      },
    );
  },

  listPortalUsers(clientId: string) {
    return apiRequest<PortalUserDto[]>(
      `${CLIENTS_API_PREFIX}/${clientId}/portal-users`,
      { auth: true },
    );
  },

  listUnlinkedPortalUsers(query: ListUnlinkedPortalUsersQueryInput) {
    return apiRequest<{
      items: PortalUserDto[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        timestamp: string;
      };
    }>(
      `${CLIENTS_API_PREFIX}/portal-users/unlinked${toUnlinkedQueryString(query)}`,
      { auth: true },
    );
  },

  linkPortalUser(clientId: string, input: LinkPortalUserInput) {
    return apiRequest<PortalUserDto>(
      `${CLIENTS_API_PREFIX}/${clientId}/portal-users`,
      {
        method: "POST",
        body: input,
        auth: true,
      },
    );
  },

  unlinkPortalUser(clientId: string, userId: string) {
    return apiRequest<PortalUserDto>(
      `${CLIENTS_API_PREFIX}/${clientId}/portal-users/${userId}`,
      {
        method: "DELETE",
        auth: true,
      },
    );
  },

  getPipelineBoard() {
    return apiRequest<ClientPipelineBoardDto>(
      `${CLIENTS_API_PREFIX}/pipeline`,
      { auth: true },
    );
  },

  updatePipelineStage(id: string, pipelineStage: ClientPipelineStageValue) {
    return apiRequest<Client>(`${CLIENTS_API_PREFIX}/${id}/pipeline-stage`, {
      method: "PATCH",
      body: { pipelineStage },
      auth: true,
    });
  },

  listActivities(clientId: string, query: ListClientActivitiesQueryInput) {
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
      `${CLIENTS_API_PREFIX}/${clientId}/activities${toActivitiesQueryString(query)}`,
      { auth: true },
    );
  },

  createActivity(clientId: string, input: CreateClientActivityInput) {
    return apiRequest<ClientActivityDto>(
      `${CLIENTS_API_PREFIX}/${clientId}/activities`,
      {
        method: "POST",
        body: input,
        auth: true,
      },
    );
  },

  deleteActivity(clientId: string, activityId: string) {
    return apiRequest<{ id: string; message: string }>(
      `${CLIENTS_API_PREFIX}/${clientId}/activities/${activityId}`,
      {
        method: "DELETE",
        auth: true,
      },
    );
  },
};
