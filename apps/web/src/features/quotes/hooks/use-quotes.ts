"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ListQuotesQueryInput } from "@enterprise/shared";

import { quotesService } from "../services/quotes.service";
import { QUOTES_QUERY_KEYS } from "../types/quotes.types";

export function useQuotes(query: ListQuotesQueryInput) {
  return useQuery({
    queryKey: QUOTES_QUERY_KEYS.list(query),
    queryFn: () => quotesService.list(query),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useQuote(id: string | null) {
  return useQuery({
    queryKey: QUOTES_QUERY_KEYS.detail(id ?? "none"),
    queryFn: () => quotesService.getById(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}
