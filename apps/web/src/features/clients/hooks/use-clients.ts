"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type {
  ListClientsQueryInput,
  ListUnlinkedPortalUsersQueryInput,
} from "@enterprise/shared";

import { clientsService } from "../services/clients.service";
import { CLIENTS_QUERY_KEYS } from "../types/clients.types";

export function useClients(query: ListClientsQueryInput) {
  return useQuery({
    queryKey: CLIENTS_QUERY_KEYS.list(query),
    queryFn: () => clientsService.list(query),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useClientStats() {
  return useQuery({
    queryKey: CLIENTS_QUERY_KEYS.stats(),
    queryFn: () => clientsService.getStats(),
    staleTime: 120_000,
  });
}

export function useClient(id: string | null) {
  return useQuery({
    queryKey: CLIENTS_QUERY_KEYS.detail(id ?? "none"),
    queryFn: () => clientsService.getById(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useClientPortalUsers(clientId: string | null) {
  return useQuery({
    queryKey: CLIENTS_QUERY_KEYS.portalUsers(clientId ?? "none"),
    queryFn: () => clientsService.listPortalUsers(clientId!),
    enabled: Boolean(clientId),
    staleTime: 30_000,
  });
}

export function useUnlinkedPortalUsers(
  query: ListUnlinkedPortalUsersQueryInput,
  enabled = true,
) {
  return useQuery({
    queryKey: CLIENTS_QUERY_KEYS.unlinkedPortalUsers(query),
    queryFn: () => clientsService.listUnlinkedPortalUsers(query),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
