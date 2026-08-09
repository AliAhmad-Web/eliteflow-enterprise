import {
  CLIENTS_API_PREFIX,
  type Client,
  type ClientListResponse,
  type CreateClientInput,
  type LinkPortalUserInput,
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
  params.set("sortBy", query.sortBy);
  params.set("sortOrder", query.sortOrder);
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
};
