"use client";

import type { PaymentExecutionStatusValue } from "@enterprise/shared";

import { Badge } from "@/components/ui/badge";

import { PAYMENT_EXECUTION_LABELS } from "../types/payments.types";

const STATUS_VARIANT = {
  INITIATED: "warning",
  PENDING: "warning",
  PENDING_VERIFICATION: "info",
  VERIFIED: "success",
  PAID: "success",
  FAILED: "destructive",
  EXPIRED: "outline",
  REJECTED: "destructive",
  REFUNDED: "secondary",
} as const;

export function PaymentStatusBadge({
  status,
}: {
  status: PaymentExecutionStatusValue;
}) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {PAYMENT_EXECUTION_LABELS[status]}
    </Badge>
  );
}
