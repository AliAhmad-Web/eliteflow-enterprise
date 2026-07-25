import type { TaskDto } from "../schemas/tasks.schema.js";
import type { PaginatedResponse } from "./api.types.js";

export type Task = TaskDto;

export type TaskListResponse = PaginatedResponse<Task>;

export interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  review: number;
  completed: number;
  blocked: number;
  overdue: number;
  highPriority: number;
}
