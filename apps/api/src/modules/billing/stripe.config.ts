/**
 * Stripe runtime configuration.
 * Live money collection requires STRIPE_SECRET_KEY + STRIPE_PAYMENTS_ENABLED=true
 * and a non-test secret key. Test keys enable sandbox checkout only.
 */

export type StripeMode = "disabled" | "test" | "live";

export function getStripeSecretKey(): string | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return key || null;
}

export function getStripeWebhookSecret(): string | null {
  const key = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  return key || null;
}

export function getStripeMode(): StripeMode {
  const key = getStripeSecretKey();
  if (!key) return "disabled";
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) return "live";
  return "disabled";
}

/**
 * Payments are enabled only when a secret key is present AND
 * STRIPE_PAYMENTS_ENABLED is explicitly "true".
 * Live mode additionally requires a live secret key.
 */
export function isStripePaymentsEnabled(): boolean {
  if (process.env.STRIPE_PAYMENTS_ENABLED !== "true") return false;
  const mode = getStripeMode();
  return mode === "test" || mode === "live";
}

export function getStripePublishableKey(): string | null {
  const key = process.env.STRIPE_PUBLISHABLE_KEY?.trim();
  return key || null;
}

export function getBillingSuccessUrl(): string {
  const web = process.env.WEB_APP_URL ?? process.env.FRONTEND_URL ?? "http://localhost:3000";
  return (
    process.env.STRIPE_CHECKOUT_SUCCESS_URL?.trim() ||
    `${web.replace(/\/$/, "")}/settings?section=billing&checkout=success`
  );
}

export function getBillingCancelUrl(): string {
  const web = process.env.WEB_APP_URL ?? process.env.FRONTEND_URL ?? "http://localhost:3000";
  return (
    process.env.STRIPE_CHECKOUT_CANCEL_URL?.trim() ||
    `${web.replace(/\/$/, "")}/settings?section=billing&checkout=cancel`
  );
}
