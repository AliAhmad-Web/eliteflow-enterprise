import type { ListTasksQueryInput } from "@enterprise/shared";

export const TASKS_QUERY_KEYS = {
  all: ["tasks"] as const,
  lists: () => [...TASKS_QUERY_KEYS.all, "list"] as const,
  list: (query: ListTasksQueryInput) =>
    [...TASKS_QUERY_KEYS.lists(), query] as const,
  stats: () => [...TASKS_QUERY_KEYS.all, "stats"] as const,
  assignees: () => [...TASKS_QUERY_KEYS.all, "assignees"] as const,
  projects: () => [...TASKS_QUERY_KEYS.all, "projects"] as const,
  details: () => [...TASKS_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...TASKS_QUERY_KEYS.details(), id] as const,
  activity: (id: string) => [...TASKS_QUERY_KEYS.all, "activity", id] as const,
};

export const TASK_STATUS_LABELS = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  REVIEW: "Review",
  COMPLETED: "Completed",
  BLOCKED: "Blocked",
} as const;

export const TASK_PRIORITY_LABELS = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
} as const;

export interface TaskAssigneeOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleCode: string;
}

export interface TaskProjectOption {
  id: string;
  name: string;
}
