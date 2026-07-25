/**
 * Phase 19.3 — Stripe architecture (no real payment processing).
 * Defines the surface area for Products, Subscriptions, Checkout,
 * Payment Intents, Customer Portal, and Webhooks.
 */

export const STRIPE_ARCHITECTURE = {
  paymentsEnabled: false,
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

export type StripeArchitectureModule =
  (typeof STRIPE_ARCHITECTURE.modules)[number];

export interface StripeProductDraft {
  name: string;
  description?: string;
  active: boolean;
  metadata?: Record<string, string>;
}

export interface StripeSubscriptionDraft {
  customerId: string;
  priceId: string;
  status: "incomplete" | "active" | "canceled" | "trialing";
}

export interface StripeCheckoutSessionDraft {
  mode: "payment" | "subscription";
  successUrl: string;
  cancelUrl: string;
  lineItems: Array<{ priceId: string; quantity: number }>;
}

export interface StripePaymentIntentDraft {
  amountCents: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, string>;
}

export interface StripeCustomerPortalDraft {
  customerId: string;
  returnUrl: string;
}

export interface StripeWebhookEventDraft {
  type: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

/**
 * Architecture stubs — throw until Phase 19.4+ enables live Stripe charges.
 */
export class StripeArchitectureService {
  assertPaymentsDisabled(): never {
    throw new Error(
      "Stripe payment processing is intentionally disabled in Phase 19.3. Architecture only.",
    );
  }

  createProduct(_draft: StripeProductDraft): never {
    return this.assertPaymentsDisabled();
  }

  createSubscription(_draft: StripeSubscriptionDraft): never {
    return this.assertPaymentsDisabled();
  }

  createCheckoutSession(_draft: StripeCheckoutSessionDraft): never {
    return this.assertPaymentsDisabled();
  }

  createPaymentIntent(_draft: StripePaymentIntentDraft): never {
    return this.assertPaymentsDisabled();
  }

  createCustomerPortalSession(_draft: StripeCustomerPortalDraft): never {
    return this.assertPaymentsDisabled();
  }

  handleWebhook(_event: StripeWebhookEventDraft): never {
    return this.assertPaymentsDisabled();
  }

  describeArchitecture() {
    return { ...STRIPE_ARCHITECTURE };
  }
}

export const stripeArchitectureService = new StripeArchitectureService();
