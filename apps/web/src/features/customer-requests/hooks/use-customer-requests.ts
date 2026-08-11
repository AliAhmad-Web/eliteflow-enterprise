"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ListCustomerRequestsQueryInput } from "@enterprise/shared";

import { customerRequestsService } from "../services/customer-requests.service";
import { CUSTOMER_REQUESTS_QUERY_KEYS } from "../types/query-keys";

export function useCustomerRequests(query: ListCustomerRequestsQueryInput) {
  return useQuery({
    queryKey: CUSTOMER_REQUESTS_QUERY_KEYS.list(query),
    queryFn: () => customerRequestsService.list(query),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCustomerRequest(id: string | null) {
  return useQuery({
    queryKey: CUSTOMER_REQUESTS_QUERY_KEYS.detail(id ?? "none"),
    queryFn: () => customerRequestsService.getById(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}
