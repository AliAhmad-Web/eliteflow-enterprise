"use client";

import { PERMISSIONS, type CustomerRequestKindValue } from "@enterprise/shared";
import { useQuery } from "@tanstack/react-query";

import { useHasPermission } from "@/features/rbac/hooks/use-permissions";

import { customerRequestsService } from "../services/customer-requests.service";
import { CUSTOMER_REQUESTS_QUERY_KEYS } from "../types/query-keys";

const ATTENTION_STATUS = "SUBMITTED" as const;

function attentionQuery(kind: CustomerRequestKindValue) {
  return {
    page: 1,
    limit: 1,
    search: "",
    status: ATTENTION_STATUS,
    kind,
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
  };
}

function useSubmittedCount(kind: CustomerRequestKindValue, enabled: boolean) {
  const query = attentionQuery(kind);
  return useQuery({
    queryKey: CUSTOMER_REQUESTS_QUERY_KEYS.list(query),
    queryFn: () => customerRequestsService.list(query),
    enabled,
    staleTime: 60_000,
    select: (data) => data.pagination.total,
  });
}

/**
 * Pending staff queue counts from the existing list API.
 * Matches the Work Requests page default status (SUBMITTED).
 */
export function useStaffRequestAttentionCounts() {
  const canReview = useHasPermission(PERMISSIONS.CUSTOMER_REQUESTS_REVIEW);
  const intake = useSubmittedCount("intake", canReview);
  const continuation = useSubmittedCount("continuation", canReview);

  return {
    enabled: canReview,
    intake: intake.data ?? 0,
    continuation: continuation.data ?? 0,
  };
}

export function formatNavBadgeCount(count: number): string | undefined {
  if (count <= 0) return undefined;
  if (count > 99) return "99+";
  return String(count);
}
