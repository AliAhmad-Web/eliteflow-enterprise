import type { ValidationError } from "@enterprise/shared";

import { AppError } from "../../shared/errors/app-error.js";

export class QuotesError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message, statusCode, code, errors);
    this.name = "QuotesError";
  }
}

export const QUOTES_ERROR_CODES = {
  NOT_FOUND: "QUOTES_NOT_FOUND",
  FORBIDDEN: "AUTH_FORBIDDEN",
  INVALID_TRANSITION: "QUOTES_INVALID_TRANSITION",
  PROJECT_NOT_FOUND: "QUOTES_PROJECT_NOT_FOUND",
  REQUEST_NOT_FOUND: "QUOTES_REQUEST_NOT_FOUND",
  REQUEST_NOT_ELIGIBLE: "QUOTES_REQUEST_NOT_ELIGIBLE",
  SCHEDULE_INVALID: "QUOTES_SCHEDULE_INVALID",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;
