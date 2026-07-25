import type { ListProjectsQueryInput } from "@enterprise/shared";

export const PROJECTS_QUERY_KEYS = {
  all: ["projects"] as const,
  lists: () => [...PROJECTS_QUERY_KEYS.all, "list"] as const,
  list: (query: ListProjectsQueryInput) =>
    [...PROJECTS_QUERY_KEYS.lists(), query] as const,
  stats: () => [...PROJECTS_QUERY_KEYS.all, "stats"] as const,
  assignees: () => [...PROJECTS_QUERY_KEYS.all, "assignees"] as const,
  details: () => [...PROJECTS_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...PROJECTS_QUERY_KEYS.details(), id] as const,
};

export const PROJECT_STATUS_LABELS = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

export const PROJECT_PRIORITY_LABELS = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
} as const;

export const MILESTONE_STATUS_LABELS = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

export interface ProjectAssigneeOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleCode: string;
}
