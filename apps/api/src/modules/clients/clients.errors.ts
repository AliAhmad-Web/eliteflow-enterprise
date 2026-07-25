import type { ValidationError } from "@enterprise/shared";

import { AppError } from "../../shared/errors/app-error.js";

export class ClientsError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message, statusCode, code, errors);
    this.name = "ClientsError";
  }
}

export const CLIENTS_ERROR_CODES = {
  NOT_FOUND: "CLIENTS_NOT_FOUND",
  EMAIL_EXISTS: "CLIENTS_EMAIL_EXISTS",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  FORBIDDEN: "AUTH_FORBIDDEN",
} as const;
