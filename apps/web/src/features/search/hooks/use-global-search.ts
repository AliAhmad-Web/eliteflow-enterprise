"use client";

import type { GlobalSearchHit, GlobalSearchResponse } from "@enterprise/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useDebouncedValue } from "@/hooks/use-debounced-value";

import { searchService } from "../services/search.service";

export const searchKeys = {
  all: ["global-search"] as const,
  query: (q: string, scope: string) =>
    [...searchKeys.all, scope, q] as const,
};

export { useDebouncedValue };

export function useGlobalSearch(q: string, enabled = true) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: searchKeys.query(trimmed, "all"),
    queryFn: () =>
      searchService.search({
        q: trimmed,
        scope: "all",
        limit: 8,
      }),
    enabled: enabled && trimmed.length >= 1,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function flattenSearchHits(
  data: GlobalSearchResponse | undefined,
): GlobalSearchHit[] {
  if (!data) return [];
  return [
    ...data.groups.users,
    ...data.groups.employees,
    ...data.groups.clients,
    ...data.groups.projects,
    ...data.groups.tasks,
    ...data.groups.files,
    ...data.groups.messages,
    ...data.groups.notifications,
    ...data.groups.invoices,
    ...data.groups.calendar,
  ];
}

export const SEARCH_GROUP_LABELS: Record<
  keyof GlobalSearchResponse["groups"],
  string
> = {
  users: "People",
  employees: "Employees",
  clients: "Clients",
  projects: "Projects",
  tasks: "Tasks",
  files: "Files",
  messages: "Messages",
  notifications: "Notifications",
  invoices: "Invoices",
  calendar: "Calendar",
};
