import type { ValidationError } from "@enterprise/shared";

import { AppError } from "../../shared/errors/app-error.js";

export class InvoicesError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message, statusCode, code, errors);
    this.name = "InvoicesError";
  }
}

export const INVOICES_ERROR_CODES = {
  NOT_FOUND: "INVOICES_NOT_FOUND",
  FORBIDDEN: "AUTH_FORBIDDEN",
  CLIENT_NOT_FOUND: "INVOICES_CLIENT_NOT_FOUND",
  PROJECT_NOT_FOUND: "INVOICES_PROJECT_NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;
