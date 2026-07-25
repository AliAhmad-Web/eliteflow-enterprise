"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ListClientsQueryInput } from "@enterprise/shared";

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
