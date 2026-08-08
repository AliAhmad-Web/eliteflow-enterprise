import type { ValidationError } from "@enterprise/shared";

import { AppError } from "../../shared/errors/app-error.js";

export class FilesError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message, statusCode, code, errors);
    this.name = "FilesError";
  }
}

export const FILES_ERROR_CODES = {
  NOT_FOUND: "FILES_NOT_FOUND",
  FORBIDDEN: "AUTH_FORBIDDEN",
  VALIDATION: "VALIDATION_ERROR",
  STORAGE: "FILES_STORAGE_ERROR",
  VIRUS_INFECTED: "FILES_VIRUS_INFECTED",
  VIRUS_UNAVAILABLE: "FILES_VIRUS_UNAVAILABLE",
} as const;
