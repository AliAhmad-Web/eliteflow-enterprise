import type { ValidationError } from "@enterprise/shared";
import type { ZodError } from "zod";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly errors: ValidationError[];

  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}

export function formatZodErrors(error: ZodError): ValidationError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "root",
    message: issue.message,
    code: issue.code,
  }));
}
