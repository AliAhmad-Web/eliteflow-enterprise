"use client";

import { useQuery } from "@tanstack/react-query";

import type {
  ListIntegrationLogsQueryInput,
  ListIntegrationsQueryInput,
  ListSyncHistoryQueryInput,
} from "@enterprise/shared";

import { integrationsService } from "../services/integrations.service";

export const integrationsKeys = {
  all: ["integrations"] as const,
  list: (filters: Partial<ListIntegrationsQueryInput>) =>
    [...integrationsKeys.all, "list", filters] as const,
  detail: (id: string) => [...integrationsKeys.all, "detail", id] as const,
  logs: (filters: Partial<ListIntegrationLogsQueryInput>) =>
    [...integrationsKeys.all, "logs", filters] as const,
  history: (filters: Partial<ListSyncHistoryQueryInput>) =>
    [...integrationsKeys.all, "history", filters] as const,
};

export function useIntegrationsOverview(
  filters: Partial<ListIntegrationsQueryInput> = {},
) {
  return useQuery({
    queryKey: integrationsKeys.list(filters),
    queryFn: () => integrationsService.list(filters),
    staleTime: 60_000,
  });
}

export function useIntegrationDetail(id: string | null) {
  return useQuery({
    queryKey: integrationsKeys.detail(id ?? ""),
    queryFn: () => integrationsService.getById(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useIntegrationBySlug(slug: string | null | undefined) {
  return useQuery({
    queryKey: [...integrationsKeys.all, "slug", slug ?? ""] as const,
    queryFn: () => integrationsService.getBySlug(slug!),
    enabled: Boolean(slug),
  });
}

export function useIntegrationLogs(
  filters: Partial<ListIntegrationLogsQueryInput> = {},
) {
  return useQuery({
    queryKey: integrationsKeys.logs(filters),
    queryFn: () =>
      integrationsService.logs({
        page: 1,
        pageSize: 10,
        ...filters,
      }),
  });
}

export function useSyncHistory(
  filters: Partial<ListSyncHistoryQueryInput> = {},
) {
  return useQuery({
    queryKey: integrationsKeys.history(filters),
    queryFn: () =>
      integrationsService.history({
        page: 1,
        pageSize: 10,
        ...filters,
      }),
  });
}

export function useMonitoringOverview(poll = false) {
  return useQuery({
    queryKey: [...integrationsKeys.all, "monitoring"] as const,
    queryFn: () => integrationsService.monitoringOverview(),
    refetchInterval: poll ? 15_000 : false,
  });
}

export function useIntegrationPlatformDetail(
  slug: string | null | undefined,
  poll = true,
) {
  return useQuery({
    queryKey: [...integrationsKeys.all, "platform", slug ?? ""] as const,
    queryFn: () => integrationsService.platformDetail(slug!),
    enabled: Boolean(slug),
    refetchInterval: poll ? 15_000 : false,
  });
}
