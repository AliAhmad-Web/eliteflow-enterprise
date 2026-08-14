import type {
  CustomerRequestDto,
  CustomerRequestPriorityValue,
  CustomerRequestStatusValue,
  CustomerRequestTypeValue,
  ListCustomerRequestsQueryInput,
} from "@enterprise/shared";
import {
  CUSTOMER_REQUEST_CONTINUATION_TYPES,
  isCustomerRequestContinuationType,
} from "@enterprise/shared";

export const CUSTOMER_REQUESTS_QUERY_KEYS = {
  all: ["customer-requests"] as const,
  lists: () => [...CUSTOMER_REQUESTS_QUERY_KEYS.all, "list"] as const,
  list: (query: ListCustomerRequestsQueryInput) =>
    [...CUSTOMER_REQUESTS_QUERY_KEYS.lists(), query] as const,
  details: () => [...CUSTOMER_REQUESTS_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) =>
    [...CUSTOMER_REQUESTS_QUERY_KEYS.details(), id] as const,
};

export type CustomerRequestListResponse = {
  items: CustomerRequestDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    timestamp: string;
  };
};

export const CUSTOMER_REQUEST_TYPE_LABELS: Record<
  CustomerRequestTypeValue,
  string
> = {
  NEW_PROJECT: "New project",
  NEW_TASK: "New task / service",
  GENERAL_SERVICE: "General service",
  REVISION: "Revision",
  ADDITIONAL_SCOPE: "Additional scope",
  REOPEN_PROJECT: "Reopen project",
  NEXT_PHASE: "Next phase",
  MAINTENANCE: "Maintenance / follow-up",
};

export const CUSTOMER_REQUEST_STATUS_LABELS: Record<
  CustomerRequestStatusValue,
  string
> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  CLARIFICATION_REQUESTED: "Clarification requested",
  CUSTOMER_RESPONDED: "Customer responded",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CONVERTED: "Approved & accepted",
  CANCELLED: "Cancelled",
};

export const CUSTOMER_REQUEST_PRIORITY_LABELS: Record<
  CustomerRequestPriorityValue,
  string
> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export function continuationOrdinalLabel(
  items: Pick<CustomerRequestDto, "id" | "type" | "createdAt">[],
  current: Pick<CustomerRequestDto, "id" | "type" | "createdAt">,
): string {
  const sameType = items
    .filter((item) => item.type === current.type)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  const index = sameType.findIndex((item) => item.id === current.id);
  const n = index >= 0 ? index + 1 : sameType.length + 1;
  return `${CUSTOMER_REQUEST_TYPE_LABELS[current.type]} #${n}`;
}

export { isCustomerRequestContinuationType, CUSTOMER_REQUEST_CONTINUATION_TYPES };
