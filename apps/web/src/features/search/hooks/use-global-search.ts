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
  departments: "Departments",
  teams: "Teams",
  leave: "Leave",
  reports: "Reports",
  aiDocuments: "AI Documents",
  announcements: "Announcements",
};

const SEARCH_GROUP_KEYS = Object.keys(
  SEARCH_GROUP_LABELS,
) as Array<keyof GlobalSearchResponse["groups"]>;

function emptyGroups(): GlobalSearchResponse["groups"] {
  return {
    users: [],
    employees: [],
    clients: [],
    projects: [],
    tasks: [],
    files: [],
    messages: [],
    notifications: [],
    invoices: [],
    calendar: [],
    departments: [],
    teams: [],
    leave: [],
    reports: [],
    aiDocuments: [],
    announcements: [],
  };
}

/** Normalize partial/legacy API payloads so UI never crashes on missing groups. */
export function normalizeSearchResponse(
  data: GlobalSearchResponse | null | undefined,
): GlobalSearchResponse | undefined {
  if (!data) return undefined;
  const base = emptyGroups();
  const incoming = (data.groups ?? {}) as Partial<
    GlobalSearchResponse["groups"]
  >;
  for (const key of SEARCH_GROUP_KEYS) {
    const value = incoming[key];
    base[key] = Array.isArray(value) ? value : [];
  }
  const total = SEARCH_GROUP_KEYS.reduce(
    (sum, key) => sum + base[key].length,
    0,
  );
  return {
    q: typeof data.q === "string" ? data.q : "",
    total: Number.isFinite(data.total) ? data.total : total,
    groups: base,
  };
}

export function useGlobalSearch(q: string, enabled = true) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: searchKeys.query(trimmed, "all"),
    queryFn: async () => {
      const raw = await searchService.search({
        q: trimmed,
        scope: "all",
        limit: 8,
      });
      return normalizeSearchResponse(raw) ?? emptyGroupsResponse(trimmed);
    },
    enabled: enabled && trimmed.length >= 1,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

function emptyGroupsResponse(q: string): GlobalSearchResponse {
  return { q, total: 0, groups: emptyGroups() };
}

export function flattenSearchHits(
  data: GlobalSearchResponse | undefined,
): GlobalSearchHit[] {
  if (!data?.groups) return [];
  return SEARCH_GROUP_KEYS.flatMap((key) => {
    const items = data.groups[key];
    return Array.isArray(items) ? items : [];
  });
}
