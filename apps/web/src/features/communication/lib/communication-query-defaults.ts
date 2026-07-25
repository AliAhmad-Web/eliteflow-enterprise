import { keepPreviousData } from "@tanstack/react-query";

/** Shared React Query defaults for Communication Hub (Slack/Notion-style cache). */
export const COMMUNICATION_STALE_TIME_MS = 5 * 60 * 1000;
export const COMMUNICATION_GC_TIME_MS = 30 * 60 * 1000;

/** Soft background refresh — not full-list hammering. */
export const COMMUNICATION_LIST_POLL_MS = 90_000;
export const COMMUNICATION_MESSAGES_POLL_MS = 45_000;
export const COMMUNICATION_PRESENCE_POLL_MS = 30_000;

export const communicationQueryDefaults = {
  staleTime: COMMUNICATION_STALE_TIME_MS,
  gcTime: COMMUNICATION_GC_TIME_MS,
  placeholderData: keepPreviousData,
  structuralSharing: true as const,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
};
