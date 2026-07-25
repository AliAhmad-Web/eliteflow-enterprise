import type { ValidationError } from "@enterprise/shared";

import { AppError } from "../../shared/errors/app-error.js";

export class TeamError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message, statusCode, code, errors);
    this.name = "TeamError";
  }
}

export const TEAM_ERROR_CODES = {
  NOT_FOUND: "TEAM_NOT_FOUND",
  FORBIDDEN: "AUTH_FORBIDDEN",
  VALIDATION: "VALIDATION_ERROR",
  CONFLICT: "TEAM_CONFLICT",
} as const;
