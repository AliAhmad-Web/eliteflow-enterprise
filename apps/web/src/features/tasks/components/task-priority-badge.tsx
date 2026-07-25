"use client";

import type { TaskPriorityValue } from "@enterprise/shared";

import { Badge } from "@/components/ui/badge";

import { TASK_PRIORITY_LABELS } from "../types/tasks.types";

const PRIORITY_VARIANT = {
  LOW: "secondary",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "destructive",
} as const;

interface TaskPriorityBadgeProps {
  priority: TaskPriorityValue;
}

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  return (
    <Badge variant={PRIORITY_VARIANT[priority]}>
      {TASK_PRIORITY_LABELS[priority]}
    </Badge>
  );
}
