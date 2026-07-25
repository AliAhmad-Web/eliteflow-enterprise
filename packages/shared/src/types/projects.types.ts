import type { ProjectDto } from "../schemas/projects.schema.js";
import type { PaginatedResponse } from "./api.types.js";

export type Project = ProjectDto;

export type ProjectListResponse = PaginatedResponse<Project>;

export interface ProjectStats {
  total: number;
  notStarted: number;
  inProgress: number;
  onHold: number;
  completed: number;
  cancelled: number;
  overdue: number;
  highPriority: number;
}
