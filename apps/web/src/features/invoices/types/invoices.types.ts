import type { ListInvoicesQueryInput } from "@enterprise/shared";

export const INVOICES_QUERY_KEYS = {
  all: ["invoices"] as const,
  lists: () => [...INVOICES_QUERY_KEYS.all, "list"] as const,
  list: (query: ListInvoicesQueryInput) =>
    [...INVOICES_QUERY_KEYS.lists(), query] as const,
  stats: () => [...INVOICES_QUERY_KEYS.all, "stats"] as const,
  details: () => [...INVOICES_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...INVOICES_QUERY_KEYS.details(), id] as const,
};

export const INVOICE_STATUS_LABELS = {
  DRAFT: "Draft",
  SENT: "Sent",
  PENDING: "Pending",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
} as const;

export const INVOICE_PAYMENT_STATUS_LABELS = {
  UNPAID: "Unpaid",
  PENDING: "Pending verification",
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
