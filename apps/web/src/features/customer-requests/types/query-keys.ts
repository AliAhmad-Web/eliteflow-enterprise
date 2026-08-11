import type {
  CustomerRequestDto,
  CustomerRequestPriorityValue,
  CustomerRequestStatusValue,
  CustomerRequestTypeValue,
  ListCustomerRequestsQueryInput,
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
};

export const CUSTOMER_REQUEST_STATUS_LABELS: Record<
  CustomerRequestStatusValue,
  string
> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  CLARIFICATION_REQUESTED: "Clarification requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CONVERTED: "Converted",
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
