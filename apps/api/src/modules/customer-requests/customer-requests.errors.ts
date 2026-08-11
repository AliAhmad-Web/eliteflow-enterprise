import type { ValidationError } from "@enterprise/shared";

import { AppError } from "../../shared/errors/app-error.js";

export class CustomerRequestsError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message, statusCode, code, errors);
    this.name = "CustomerRequestsError";
  }
}

export const CUSTOMER_REQUESTS_ERROR_CODES = {
  NOT_FOUND: "CUSTOMER_REQUESTS_NOT_FOUND",
  FORBIDDEN: "AUTH_FORBIDDEN",
  UNLINKED: "CUSTOMER_REQUESTS_UNLINKED",
  INVALID_TRANSITION: "CUSTOMER_REQUESTS_INVALID_TRANSITION",
  ALREADY_CONVERTED: "CUSTOMER_REQUESTS_ALREADY_CONVERTED",
  PROJECT_NOT_FOUND: "CUSTOMER_REQUESTS_PROJECT_NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;
