import type {
  OrganizationSubscriptionDto,
  SubscriptionEventDto,
  SubscriptionPlanDto,
} from "@enterprise/shared";

import { isStripePaymentsEnabled } from "./stripe.config.js";
import { describeStripeRuntime } from "./stripe.client.js";

export function toPlanDto(row: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  amountCents: number;
  currency: string;
  interval: string;
  seatsIncluded: number;
  storageQuotaBytes: bigint;
  aiCreditsIncluded: number;
  featuresJson: unknown;
  trialDays: number;
  isActive: boolean;
  stripePriceId: string | null;
}): SubscriptionPlanDto {
  const features = Array.isArray(row.featuresJson)
    ? row.featuresJson.filter((f): f is string => typeof f === "string")
    : [];

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    amountCents: row.amountCents,
    currency: row.currency,
    interval: row.interval,
    seatsIncluded: row.seatsIncluded,
    storageQuotaBytes: row.storageQuotaBytes.toString(),
    aiCreditsIncluded: row.aiCreditsIncluded,
    features,
    trialDays: row.trialDays,
    isActive: row.isActive,
    checkoutReady: Boolean(row.stripePriceId) && isStripePaymentsEnabled(),
  };
}

export function toSubscriptionDto(
  row: {
    planCode: string;
    planName: string;
    status: string;
    seatsIncluded: number;
    storageQuotaBytes: bigint;
    aiCreditsIncluded: number;
    aiCreditsUsed: number;
    billingEmail: string | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    trialEndsAt: Date | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  },
  seatsUsed: number,
  storageUsedBytes: bigint,
): OrganizationSubscriptionDto {
  const runtime = describeStripeRuntime();
  return {
    planCode: row.planCode,
    planName: row.planName,
    status: row.status,
    seatsIncluded: row.seatsIncluded,
    seatsUsed,
    storageQuotaBytes: row.storageQuotaBytes.toString(),
    storageUsedBytes: storageUsedBytes.toString(),
    aiCreditsIncluded: row.aiCreditsIncluded,
    aiCreditsUsed: row.aiCreditsUsed,
    billingEmail: row.billingEmail,
    currentPeriodStart: row.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
    hasStripeCustomer: Boolean(row.stripeCustomerId),
    hasStripeSubscription: Boolean(row.stripeSubscriptionId),
    paymentsEnabled: runtime.paymentsEnabled,
    stripeMode: runtime.mode,
  };
}

export function toEventDto(row: {
  id: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: Date;
}): SubscriptionEventDto {
  return {
    id: row.id,
    eventType: row.eventType,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    createdAt: row.createdAt.toISOString(),
  };
}
