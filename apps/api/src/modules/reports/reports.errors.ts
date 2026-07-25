import type { ValidationError } from "@enterprise/shared";

import { AppError } from "../../shared/errors/app-error.js";

export class ReportsError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message, statusCode, code, errors);
    this.name = "ReportsError";
  }
}

export const REPORTS_ERROR_CODES = {
  NOT_FOUND: "REPORTS_NOT_FOUND",
  FORBIDDEN: "AUTH_FORBIDDEN",
  VALIDATION: "VALIDATION_ERROR",
} as const;
