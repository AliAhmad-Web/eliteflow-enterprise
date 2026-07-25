import type { ValidationError } from "@enterprise/shared";

import { AppError } from "../../shared/errors/app-error.js";

export class SecurityError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message, statusCode, code, errors);
    this.name = "SecurityError";
  }
}

export const SECURITY_ERROR_CODES = {
  FORBIDDEN: "SECURITY_FORBIDDEN",
  NOT_FOUND: "SECURITY_NOT_FOUND",
  VALIDATION: "SECURITY_VALIDATION",
  PASSWORD_REUSED: "SECURITY_PASSWORD_REUSED",
  CAPTCHA_FAILED: "SECURITY_CAPTCHA_FAILED",
  CSRF_INVALID: "SECURITY_CSRF_INVALID",
  ACCOUNT_NOT_LOCKED: "SECURITY_ACCOUNT_NOT_LOCKED",
} as const;

export type SecurityErrorCode =
  (typeof SECURITY_ERROR_CODES)[keyof typeof SECURITY_ERROR_CODES];
