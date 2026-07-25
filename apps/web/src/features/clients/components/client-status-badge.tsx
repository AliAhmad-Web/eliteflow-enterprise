"use client";

import type { ClientStatusValue } from "@enterprise/shared";

import { Badge } from "@/components/ui/badge";

import { CLIENT_STATUS_LABELS } from "../types/clients.types";

const STATUS_VARIANT = {
  LEAD: "info",
  ACTIVE: "success",
  INACTIVE: "secondary",
} as const;

interface ClientStatusBadgeProps {
  status: ClientStatusValue;
}

export function ClientStatusBadge({ status }: ClientStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {CLIENT_STATUS_LABELS[status]}
    </Badge>
  );
}
