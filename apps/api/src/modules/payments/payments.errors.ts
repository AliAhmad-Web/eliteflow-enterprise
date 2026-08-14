import type { ValidationError } from "@enterprise/shared";

import { AppError } from "../../shared/errors/app-error.js";

export class PaymentsError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors: ValidationError[] = [],
  ) {
    super(message, statusCode, code, errors);
    this.name = "PaymentsError";
  }
}

export const PAYMENTS_ERROR_CODES = {
  NOT_FOUND: "PAYMENTS_NOT_FOUND",
  FORBIDDEN: "AUTH_FORBIDDEN",
  INVALID_TRANSITION: "PAYMENTS_INVALID_TRANSITION",
  AMOUNT_INVALID: "PAYMENTS_AMOUNT_INVALID",
  INVOICE_NOT_PAYABLE: "PAYMENTS_INVOICE_NOT_PAYABLE",
  METHOD_DISABLED: "PAYMENTS_METHOD_DISABLED",
  PROVIDER_NOT_CONFIGURED: "PAYMENTS_PROVIDER_NOT_CONFIGURED",
  CURRENCY_UNSUPPORTED: "PAYMENTS_CURRENCY_UNSUPPORTED",
  IN_FLIGHT_EXISTS: "PAYMENTS_IN_FLIGHT_EXISTS",
  CALLBACK_INVALID: "PAYMENTS_CALLBACK_INVALID",
  CALLBACK_REPLAY: "PAYMENTS_CALLBACK_REPLAY",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;
