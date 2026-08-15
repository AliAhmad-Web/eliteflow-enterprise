"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ListQuotesQueryInput } from "@enterprise/shared";

import { quotesService } from "../services/quotes.service";
import { QUOTES_QUERY_KEYS } from "../types/quotes.types";

export function useQuotes(
  query: ListQuotesQueryInput,
  options?: { refetchInterval?: number },
) {
  return useQuery({
    queryKey: QUOTES_QUERY_KEYS.list(query),
    queryFn: () => quotesService.list(query),
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    refetchInterval: options?.refetchInterval,
  });
}

export function useQuote(id: string | null) {
  return useQuery({
    queryKey: QUOTES_QUERY_KEYS.detail(id ?? "none"),
    queryFn: () => quotesService.getById(id!),
    enabled: Boolean(id),
    staleTime: 15_000,
    refetchInterval: 8_000,
  });
}
