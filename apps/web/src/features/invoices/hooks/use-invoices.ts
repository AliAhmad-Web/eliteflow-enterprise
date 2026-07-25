"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ListInvoicesQueryInput } from "@enterprise/shared";

import { invoicesService } from "../services/invoices.service";
import { INVOICES_QUERY_KEYS } from "../types/invoices.types";

export function useInvoices(query: ListInvoicesQueryInput) {
  return useQuery({
    queryKey: INVOICES_QUERY_KEYS.list(query),
    queryFn: () => invoicesService.list(query),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useInvoiceStats() {
  return useQuery({
    queryKey: INVOICES_QUERY_KEYS.stats(),
    queryFn: () => invoicesService.getStats(),
    staleTime: 120_000,
  });
}

export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: INVOICES_QUERY_KEYS.detail(id ?? "none"),
    queryFn: () => invoicesService.getById(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}
