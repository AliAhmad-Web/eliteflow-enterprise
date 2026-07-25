"use client";

import type { TaskStatusValue } from "@enterprise/shared";

import { Badge } from "@/components/ui/badge";

import { TASK_STATUS_LABELS } from "../types/tasks.types";

const STATUS_VARIANT = {
  TODO: "secondary",
  IN_PROGRESS: "info",
  REVIEW: "warning",
  COMPLETED: "success",
  BLOCKED: "destructive",
} as const;

interface TaskStatusBadgeProps {
  status: TaskStatusValue;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>{TASK_STATUS_LABELS[status]}</Badge>
  );
}
