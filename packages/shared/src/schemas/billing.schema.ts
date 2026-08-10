import { z } from "zod";

export const SUBSCRIPTION_PLAN_INTERVALS = ["month", "year"] as const;

export const createCheckoutSessionSchema = z.object({
  planCode: z.string().min(1).max(50),
  successUrl: z.string().url().max(2048).optional(),
  cancelUrl: z.string().url().max(2048).optional(),
});

export type CreateCheckoutSessionInput = z.infer<
  typeof createCheckoutSessionSchema
>;

export const cancelSubscriptionSchema = z.object({
  atPeriodEnd: z.boolean().optional().default(true),
});

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

export const subscriptionPlanDtoSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  amountCents: z.number().int(),
  currency: z.string(),
  interval: z.string(),
  seatsIncluded: z.number().int(),
  storageQuotaBytes: z.string(),
  aiCreditsIncluded: z.number().int(),
  features: z.array(z.string()),
  trialDays: z.number().int(),
  isActive: z.boolean(),
  /** True when a Stripe price id is configured for checkout. */
  checkoutReady: z.boolean(),
});

export type SubscriptionPlanDto = z.infer<typeof subscriptionPlanDtoSchema>;

export const organizationSubscriptionDtoSchema = z.object({
  planCode: z.string(),
  planName: z.string(),
  status: z.string(),
  seatsIncluded: z.number().int(),
  seatsUsed: z.number().int(),
  storageQuotaBytes: z.string(),
  storageUsedBytes: z.string(),
  aiCreditsIncluded: z.number().int(),
  aiCreditsUsed: z.number().int(),
  billingEmail: z.string().nullable(),
  currentPeriodStart: z.string().nullable(),
  currentPeriodEnd: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  trialEndsAt: z.string().nullable(),
  hasStripeCustomer: z.boolean(),
  hasStripeSubscription: z.boolean(),
  paymentsEnabled: z.boolean(),
  stripeMode: z.enum(["disabled", "test", "live"]),
});

export type OrganizationSubscriptionDto = z.infer<
  typeof organizationSubscriptionDtoSchema
>;

export const subscriptionEventDtoSchema = z.object({
  id: z.string().uuid(),
  eventType: z.string(),
  fromStatus: z.string().nullable(),
  toStatus: z.string().nullable(),
  createdAt: z.string(),
});

export type SubscriptionEventDto = z.infer<typeof subscriptionEventDtoSchema>;

export const checkoutSessionResponseSchema = z.object({
  url: z.string().url().nullable(),
  sessionId: z.string(),
  paymentsEnabled: z.boolean(),
  mode: z.enum(["disabled", "test", "live"]),
});

export type CheckoutSessionResponse = z.infer<
  typeof checkoutSessionResponseSchema
>;
