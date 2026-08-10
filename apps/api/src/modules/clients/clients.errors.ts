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
  PORTAL_USER_NOT_FOUND: "CLIENTS_PORTAL_USER_NOT_FOUND",
  PORTAL_USER_NOT_CLIENT: "CLIENTS_PORTAL_USER_NOT_CLIENT",
  PORTAL_USER_ALREADY_LINKED: "CLIENTS_PORTAL_USER_ALREADY_LINKED",
  PORTAL_USER_LINKED_ELSEWHERE: "CLIENTS_PORTAL_USER_LINKED_ELSEWHERE",
  PORTAL_USER_NOT_LINKED: "CLIENTS_PORTAL_USER_NOT_LINKED",
  ACTIVITY_NOT_FOUND: "CLIENTS_ACTIVITY_NOT_FOUND",
} as const;
