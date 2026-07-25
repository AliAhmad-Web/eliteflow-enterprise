import type { ValidationError } from "@enterprise/shared";

import { AppError } from "../../shared/errors/app-error.js";

export class AuthError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message, statusCode, code, errors);
    this.name = "AuthError";
  }
}
