import type { ListClientsQueryInput } from "@enterprise/shared";

export const CLIENTS_QUERY_KEYS = {
  all: ["clients"] as const,
  lists: () => [...CLIENTS_QUERY_KEYS.all, "list"] as const,
  list: (query: ListClientsQueryInput) =>
    [...CLIENTS_QUERY_KEYS.lists(), query] as const,
  stats: () => [...CLIENTS_QUERY_KEYS.all, "stats"] as const,
  details: () => [...CLIENTS_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...CLIENTS_QUERY_KEYS.details(), id] as const,
};

export const CLIENT_STATUS_LABELS = {
  LEAD: "Lead",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
} as const;
