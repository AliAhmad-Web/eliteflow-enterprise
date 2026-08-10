import Stripe from "stripe";

import {
  getStripeMode,
  getStripeSecretKey,
  getStripeWebhookSecret,
  isStripePaymentsEnabled,
  type StripeMode,
} from "./stripe.config.js";
import { BillingError, BILLING_ERROR_CODES } from "./billing.errors.js";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  const key = getStripeSecretKey();
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return stripeClient;
}

export function requireStripeClient(): Stripe {
  const client = getStripeClient();
  if (!client || !isStripePaymentsEnabled()) {
    throw new BillingError(
      "Stripe payments are not enabled. Configure STRIPE_SECRET_KEY and STRIPE_PAYMENTS_ENABLED=true (test mode supported).",
      503,
      BILLING_ERROR_CODES.PAYMENTS_DISABLED,
    );
  }
  return client;
}

export function describeStripeRuntime(): {
  paymentsEnabled: boolean;
  mode: StripeMode;
  webhookConfigured: boolean;
} {
  return {
    paymentsEnabled: isStripePaymentsEnabled(),
    mode: getStripeMode(),
    webhookConfigured: Boolean(getStripeWebhookSecret()),
  };
}

export function constructStripeEvent(
  rawBody: Buffer | string,
  signature: string,
): Stripe.Event {
  const secret = getStripeWebhookSecret();
  const client = getStripeClient();
  if (!client || !secret) {
    throw new BillingError(
      "Stripe webhook secret is not configured",
      503,
      BILLING_ERROR_CODES.WEBHOOK_NOT_CONFIGURED,
    );
  }
  try {
    return client.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    throw new BillingError(
      "Invalid Stripe webhook signature",
      401,
      BILLING_ERROR_CODES.WEBHOOK_SIGNATURE_INVALID,
    );
  }
}
