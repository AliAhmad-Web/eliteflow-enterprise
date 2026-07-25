import type { ValidationError } from "@enterprise/shared";

import { AppError } from "../../shared/errors/app-error.js";

export class TasksError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message, statusCode, code, errors);
    this.name = "TasksError";
  }
}

export const TASKS_ERROR_CODES = {
  NOT_FOUND: "TASKS_NOT_FOUND",
  FORBIDDEN: "AUTH_FORBIDDEN",
  PROJECT_NOT_FOUND: "TASKS_PROJECT_NOT_FOUND",
  ASSIGNEE_NOT_FOUND: "TASKS_ASSIGNEE_NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;
