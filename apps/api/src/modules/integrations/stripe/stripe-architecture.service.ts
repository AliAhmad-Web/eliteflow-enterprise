/**
 * Phase 19.3+ — Stripe architecture now backed by billing module.
 * Live charges require STRIPE_PAYMENTS_ENABLED=true + STRIPE_SECRET_KEY.
 */
import { describeStripeRuntime } from "../../billing/stripe.client.js";
import { isStripePaymentsEnabled } from "../../billing/stripe.config.js";

export const STRIPE_ARCHITECTURE = {
  get paymentsEnabled() {
    return isStripePaymentsEnabled();
  },
  apiVersion: "stripe.v1",
  modules: [
    "products",
    "subscriptions",
    "checkout",
    "payment_intents",
    "customer_portal",
    "webhooks",
  ] as const,
} as const;

export class StripeArchitectureService {
  describeArchitecture() {
    const runtime = describeStripeRuntime();
    return {
      ...STRIPE_ARCHITECTURE,
      paymentsEnabled: runtime.paymentsEnabled,
      mode: runtime.mode,
      webhookConfigured: runtime.webhookConfigured,
      note: runtime.paymentsEnabled
        ? "Stripe checkout/webhooks enabled via billing module"
        : "Set STRIPE_SECRET_KEY and STRIPE_PAYMENTS_ENABLED=true to enable (test keys supported)",
    };
  }
}

export const stripeArchitectureService = new StripeArchitectureService();
