"use client";

import type { ProjectPriorityValue } from "@enterprise/shared";

import { Badge } from "@/components/ui/badge";

import { PROJECT_PRIORITY_LABELS } from "../types/projects.types";

const PRIORITY_VARIANT = {
  LOW: "secondary",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "destructive",
} as const;

interface ProjectPriorityBadgeProps {
  priority: ProjectPriorityValue;
}

export function ProjectPriorityBadge({ priority }: ProjectPriorityBadgeProps) {
  return (
    <Badge variant={PRIORITY_VARIANT[priority]}>
      {PROJECT_PRIORITY_LABELS[priority]}
    </Badge>
  );
}
