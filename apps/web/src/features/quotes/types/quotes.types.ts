import type {
  ListQuotesQueryInput,
  PaymentModelValue,
  QuoteStatusValue,
} from "@enterprise/shared";

export const QUOTES_QUERY_KEYS = {
  all: ["quotes"] as const,
  lists: () => [...QUOTES_QUERY_KEYS.all, "list"] as const,
  list: (query: ListQuotesQueryInput) =>
    [...QUOTES_QUERY_KEYS.lists(), query] as const,
  details: () => [...QUOTES_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...QUOTES_QUERY_KEYS.details(), id] as const,
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatusValue, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUS_LABELS = {
  UNPAID: "Unpaid",
  PENDING: "Pending",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  FAILED: "Failed",
  EXPIRED: "Expired",
  REFUNDED: "Refunded",
} as const;

export const INVOICE_KIND_LABELS = {
  STANDARD: "Standard",
  ADVANCE: "Advance",
  MILESTONE: "Milestone",
  FINAL: "Final",
} as const;

export const PAYMENT_MODEL_OPTIONS: Array<{
  value: PaymentModelValue;
  label: string;
}> = [
  { value: "UPFRONT_100", label: "100% Upfront" },
  { value: "SPLIT_50_50", label: "50% Advance + 50% Final" },
  { value: "SPLIT_30_70", label: "30% Advance + 70% Final" },
  { value: "SPLIT_35_65", label: "35% Advance + 65% Final" },
  { value: "SPLIT_40_60", label: "40% Advance + 60% Final" },
  { value: "MILESTONE", label: "Milestone based" },
  { value: "CUSTOM", label: "Custom payment schedule" },
];
