import type { ValidationError } from "@enterprise/shared";

import { AppError } from "../../shared/errors/app-error.js";

export class ProjectsError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message, statusCode, code, errors);
    this.name = "ProjectsError";
  }
}

export const PROJECTS_ERROR_CODES = {
  NOT_FOUND: "PROJECTS_NOT_FOUND",
  FORBIDDEN: "AUTH_FORBIDDEN",
  CLIENT_NOT_FOUND: "PROJECTS_CLIENT_NOT_FOUND",
  MEMBER_NOT_FOUND: "PROJECTS_MEMBER_NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;
