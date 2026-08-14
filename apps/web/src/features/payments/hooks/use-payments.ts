"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ListPaymentsQueryInput } from "@enterprise/shared";

import { paymentsService } from "../services/payments.service";
import { PAYMENTS_QUERY_KEYS } from "../types/payments.types";

export function usePayments(query: ListPaymentsQueryInput) {
  return useQuery({
    queryKey: PAYMENTS_QUERY_KEYS.list(query),
    queryFn: () => paymentsService.list(query),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function usePayment(id: string | null) {
  return useQuery({
    queryKey: PAYMENTS_QUERY_KEYS.detail(id ?? "none"),
    queryFn: () => paymentsService.getById(id!),
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: PAYMENTS_QUERY_KEYS.methods(),
    queryFn: () => paymentsService.listMethods(),
    staleTime: 60_000,
  });
}
