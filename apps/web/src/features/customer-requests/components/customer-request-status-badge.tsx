"use client";

import type { CustomerRequestStatusValue } from "@enterprise/shared";

import { Badge } from "@/components/ui/badge";

import { CUSTOMER_REQUEST_STATUS_LABELS } from "../types/query-keys";

const STATUS_VARIANT = {
  DRAFT: "secondary",
  SUBMITTED: "info",
  UNDER_REVIEW: "warning",
  CLARIFICATION_REQUESTED: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  CONVERTED: "success",
  CANCELLED: "outline",
} as const;

interface CustomerRequestStatusBadgeProps {
  status: CustomerRequestStatusValue;
}

export function CustomerRequestStatusBadge({
  status,
}: CustomerRequestStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {CUSTOMER_REQUEST_STATUS_LABELS[status]}
    </Badge>
  );
}
