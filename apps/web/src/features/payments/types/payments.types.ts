import type {
  ListPaymentsQueryInput,
  PakistanPaymentMethodValue,
  PaymentExecutionStatusValue,
} from "@enterprise/shared";

export const PAYMENTS_QUERY_KEYS = {
  all: ["payments"] as const,
  lists: () => [...PAYMENTS_QUERY_KEYS.all, "list"] as const,
  list: (query: ListPaymentsQueryInput) =>
    [...PAYMENTS_QUERY_KEYS.lists(), query] as const,
  methods: () => [...PAYMENTS_QUERY_KEYS.all, "methods"] as const,
  details: () => [...PAYMENTS_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...PAYMENTS_QUERY_KEYS.details(), id] as const,
};

export const PAYMENT_EXECUTION_LABELS: Record<
  PaymentExecutionStatusValue,
  string
> = {
  INITIATED: "Payment pending",
  PENDING: "Payment pending",
  PENDING_VERIFICATION: "Under verification",
  VERIFIED: "Payment verified",
  PAID: "Payment completed",
  FAILED: "Payment failed",
  EXPIRED: "Payment expired",
  REJECTED: "Payment rejected",
  REFUNDED: "Refunded",
};

export const PAYMENT_METHOD_LABELS: Record<PakistanPaymentMethodValue, string> =
  {
    BANK_TRANSFER: "Bank Transfer",
    JAZZCASH: "JazzCash QR",
    EASYPAISA: "EasyPaisa QR",
  };
