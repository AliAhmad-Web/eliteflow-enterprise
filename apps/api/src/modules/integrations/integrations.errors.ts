import type { ValidationError } from "@enterprise/shared";

import { AppError } from "../../shared/errors/app-error.js";

export class IntegrationsError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message, statusCode, code, errors);
    this.name = "IntegrationsError";
  }
}

export const INTEGRATIONS_ERROR_CODES = {
  FORBIDDEN: "INTEGRATIONS_FORBIDDEN",
  NOT_FOUND: "INTEGRATIONS_NOT_FOUND",
  VALIDATION: "INTEGRATIONS_VALIDATION",
  CONFLICT: "INTEGRATIONS_CONFLICT",
  HEALTH_FAILED: "INTEGRATIONS_HEALTH_FAILED",
} as const;
