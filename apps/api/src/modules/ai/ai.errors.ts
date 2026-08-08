import type { ValidationError } from "@enterprise/shared";

import { AppError } from "../../shared/errors/app-error.js";

export class AiError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message, statusCode, code, errors);
    this.name = "AiError";
  }
}

export const AI_ERROR_CODES = {
  NOT_FOUND: "AI_NOT_FOUND",
  FORBIDDEN: "AUTH_FORBIDDEN",
  PROVIDER_ERROR: "AI_PROVIDER_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PROMPT_SECURITY_DENIED: "AI_PROMPT_SECURITY_DENIED",
  BUDGET_EXCEEDED: "AI_BUDGET_EXCEEDED",
} as const;
