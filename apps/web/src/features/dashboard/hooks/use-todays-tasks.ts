"use client";

import type { ListTasksQueryInput, Task } from "@enterprise/shared";
import { PERMISSIONS } from "@enterprise/shared";
import { useMemo } from "react";

import { useAuthStore } from "@/features/auth/stores/auth.store";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { useTasks } from "@/features/tasks/hooks/use-tasks";

function dayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function isDueToday(task: Task, start: Date, end: Date) {
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  return due >= start && due <= end;
}

/**
 * Today's tasks for the logged-in user (assigned), RBAC-gated via Tasks API.
 */
export function useTodaysTasks(limit = 8) {
  const userId = useAuthStore((state) => state.user?.id);
  const canRead = useHasPermission(PERMISSIONS.TASKS_READ);
  const enabled = Boolean(canRead && userId);

  const query = useMemo<ListTasksQueryInput>(
    () => ({
      assignedToId: userId,
      sortBy: "dueDate",
      sortOrder: "asc",
      page: 1,
      limit: 50,
      search: "",
    }),
    [userId],
  );

  const result = useTasks(query, { enabled });

  const { tasks, totalToday } = useMemo(() => {
    const { start, end } = dayBounds();
    const items = result.data?.items ?? [];
    const todayItems = items.filter((task) => isDueToday(task, start, end));
    return {
      tasks: todayItems.slice(0, limit),
      totalToday: todayItems.length,
    };
  }, [result.data?.items, limit]);

  return {
    ...result,
    enabled,
    canRead,
    tasks,
    totalToday,
  };
}
