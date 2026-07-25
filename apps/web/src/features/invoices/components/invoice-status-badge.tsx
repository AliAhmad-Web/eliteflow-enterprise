"use client";

import type { InvoiceStatusValue } from "@enterprise/shared";

import { Badge } from "@/components/ui/badge";

import { INVOICE_STATUS_LABELS } from "../types/invoices.types";

const STATUS_VARIANT = {
  DRAFT: "secondary",
  SENT: "info",
  PENDING: "warning",
  PAID: "success",
  OVERDUE: "destructive",
  CANCELLED: "outline",
} as const;

interface InvoiceStatusBadgeProps {
  status: InvoiceStatusValue;
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {INVOICE_STATUS_LABELS[status]}
    </Badge>
  );
}
