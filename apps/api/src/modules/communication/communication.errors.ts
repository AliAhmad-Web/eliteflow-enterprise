import type { ValidationError } from "@enterprise/shared";

import { AppError } from "../../shared/errors/app-error.js";

export class CommunicationError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message, statusCode, code, errors);
    this.name = "CommunicationError";
  }
}

export const COMMUNICATION_ERROR_CODES = {
  NOT_FOUND: "COMMUNICATION_NOT_FOUND",
  FORBIDDEN: "AUTH_FORBIDDEN",
  VALIDATION: "VALIDATION_ERROR",
  CONFLICT: "COMMUNICATION_CONFLICT",
} as const;
