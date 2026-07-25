"use client";

import type { ProjectStatusValue } from "@enterprise/shared";

import { Badge } from "@/components/ui/badge";

import { PROJECT_STATUS_LABELS } from "../types/projects.types";

const STATUS_VARIANT = {
  NOT_STARTED: "secondary",
  IN_PROGRESS: "info",
  ON_HOLD: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
} as const;

interface ProjectStatusBadgeProps {
  status: ProjectStatusValue;
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}
