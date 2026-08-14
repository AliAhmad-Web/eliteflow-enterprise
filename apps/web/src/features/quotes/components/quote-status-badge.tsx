"use client";

import type { QuoteStatusValue } from "@enterprise/shared";

import { Badge } from "@/components/ui/badge";

import { QUOTE_STATUS_LABELS } from "../types/quotes.types";

const STATUS_VARIANT = {
  DRAFT: "secondary",
  SENT: "info",
  APPROVED: "success",
  REJECTED: "destructive",
  EXPIRED: "warning",
  CANCELLED: "outline",
} as const;

export function QuoteStatusBadge({ status }: { status: QuoteStatusValue }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>{QUOTE_STATUS_LABELS[status]}</Badge>
  );
}
