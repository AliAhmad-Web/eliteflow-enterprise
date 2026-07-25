import type { ValidationError } from "@enterprise/shared";

import { AppError } from "../../shared/errors/app-error.js";

export class SettingsError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message, statusCode, code, errors);
    this.name = "SettingsError";
  }
}

export const SETTINGS_ERROR_CODES = {
  FORBIDDEN: "SETTINGS_FORBIDDEN",
  NOT_FOUND: "SETTINGS_NOT_FOUND",
  VALIDATION: "SETTINGS_VALIDATION",
  CONFLICT: "SETTINGS_CONFLICT",
} as const;
