import { AppError } from "../../shared/errors/app-error.js";

export const BILLING_ERROR_CODES = {
  NOT_FOUND: "BILLING_NOT_FOUND",
  PLAN_NOT_FOUND: "BILLING_PLAN_NOT_FOUND",
  PLAN_NOT_CHECKOUT_READY: "BILLING_PLAN_NOT_CHECKOUT_READY",
  PAYMENTS_DISABLED: "BILLING_PAYMENTS_DISABLED",
  FORBIDDEN: "BILLING_FORBIDDEN",
  WEBHOOK_SIGNATURE_INVALID: "BILLING_WEBHOOK_SIGNATURE_INVALID",
  WEBHOOK_NOT_CONFIGURED: "BILLING_WEBHOOK_NOT_CONFIGURED",
  ALREADY_SUBSCRIBED: "BILLING_ALREADY_SUBSCRIBED",
  NO_SUBSCRIPTION: "BILLING_NO_SUBSCRIPTION",
  VALIDATION: "BILLING_VALIDATION",
} as const;

export class BillingError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: unknown,
  ) {
    super(
      message,
      statusCode,
      code,
      details
        ? [{ field: "billing", message: String(details), code: "billing" }]
        : [],
    );
    this.name = "BillingError";
  }
}
