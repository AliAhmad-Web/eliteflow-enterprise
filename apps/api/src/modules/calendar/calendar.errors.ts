import type { ValidationError } from "@enterprise/shared";

import { AppError } from "../../shared/errors/app-error.js";

export class CalendarError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message, statusCode, code, errors);
    this.name = "CalendarError";
  }
}

export const CALENDAR_ERROR_CODES = {
  NOT_FOUND: "CALENDAR_NOT_FOUND",
  FORBIDDEN: "AUTH_FORBIDDEN",
  VALIDATION: "VALIDATION_ERROR",
} as const;
