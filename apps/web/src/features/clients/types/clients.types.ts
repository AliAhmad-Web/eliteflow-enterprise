import type {
  ClientActivityTypeValue,
  ClientPipelineStageValue,
  ListClientActivitiesQueryInput,
  ListClientsQueryInput,
  ListUnlinkedPortalUsersQueryInput,
} from "@enterprise/shared";

export const CLIENTS_QUERY_KEYS = {
  all: ["clients"] as const,
  lists: () => [...CLIENTS_QUERY_KEYS.all, "list"] as const,
  list: (query: ListClientsQueryInput) =>
    [...CLIENTS_QUERY_KEYS.lists(), query] as const,
  stats: () => [...CLIENTS_QUERY_KEYS.all, "stats"] as const,
  pipeline: () => [...CLIENTS_QUERY_KEYS.all, "pipeline"] as const,
  details: () => [...CLIENTS_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...CLIENTS_QUERY_KEYS.details(), id] as const,
  activities: (clientId: string, query: ListClientActivitiesQueryInput) =>
    [...CLIENTS_QUERY_KEYS.all, "activities", clientId, query] as const,
  portalUsers: (clientId: string) =>
    [...CLIENTS_QUERY_KEYS.all, "portal-users", clientId] as const,
  unlinkedPortalUsers: (query: ListUnlinkedPortalUsersQueryInput) =>
    [...CLIENTS_QUERY_KEYS.all, "portal-users-unlinked", query] as const,
};

export const CLIENT_STATUS_LABELS = {
  LEAD: "Lead",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
} as const;

export const CLIENT_PIPELINE_STAGE_LABELS: Record<
  ClientPipelineStageValue,
  string
> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

export const CLIENT_ACTIVITY_TYPE_LABELS: Record<
  ClientActivityTypeValue,
  string
> = {
  NOTE: "Note",
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  STATUS_CHANGE: "Status change",
  OTHER: "Other",
};
