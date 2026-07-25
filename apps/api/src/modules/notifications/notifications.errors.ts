import type { ValidationError } from "@enterprise/shared";

import { AppError } from "../../shared/errors/app-error.js";

export class NotificationsError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message, statusCode, code, errors);
    this.name = "NotificationsError";
  }
}

export const NOTIFICATIONS_ERROR_CODES = {
  NOT_FOUND: "NOTIFICATIONS_NOT_FOUND",
  FORBIDDEN: "AUTH_FORBIDDEN",
  VALIDATION: "VALIDATION_ERROR",
} as const;
