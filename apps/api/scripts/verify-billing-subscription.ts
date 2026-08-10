/**
 * Subscription & Billing verification (service-layer + Stripe config safety).
 *
 * Run:
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/verify-billing-subscription.ts
 *
 * Uses production Supabase DATABASE_URL. Does not charge cards.
 * Creates no Stripe objects unless STRIPE_PAYMENTS_ENABLED=true (then still avoids live checkout).
 */
import assert from "node:assert/strict";

import { prisma } from "@enterprise/database";
import { PERMISSIONS, UserRole } from "@enterprise/shared";

import { billingService } from "../src/modules/billing/billing.service.js";
import { BILLING_ERROR_CODES, BillingError } from "../src/modules/billing/billing.errors.js";
import {
  getStripeMode,
  isStripePaymentsEnabled,
} from "../src/modules/billing/stripe.config.js";
import { describeStripeRuntime } from "../src/modules/billing/stripe.client.js";
import { billingRepository } from "../src/modules/billing/billing.repository.js";

async function roleHasPermission(roleCode: string, key: string) {
  const role = await prisma.role.findFirst({
    where: { code: roleCode },
    select: {
      rolePermissions: { select: { permission: { select: { key: true } } } },
    },
  });
  if (!role) return false;
  const keys = role.rolePermissions.map((r) => r.permission.key);
  return keys.includes("*") || keys.includes(key);
}

async function main() {
  const admin = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      role: { code: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] } },
    },
    select: { id: true, email: true, role: { select: { code: true } } },
  });
  assert.ok(admin);

  assert.equal(
    await roleHasPermission(UserRole.ADMIN, PERMISSIONS.SETTINGS_MANAGE),
    true,
  );
  assert.equal(
    await roleHasPermission(UserRole.CLIENT, PERMISSIONS.SETTINGS_MANAGE),
    false,
    "CLIENT must not manage billing",
  );

  const plans = await billingService.listPlans();
  assert.ok(plans.length >= 3, "expected seeded plans");
  assert.ok(plans.every((p) => p.code && p.name));

  const sub = await billingService.getSubscription();
  assert.ok(sub.planCode);
  assert.ok(typeof sub.paymentsEnabled === "boolean");
  assert.ok(["disabled", "test", "live"].includes(sub.stripeMode));

  // Plan access isolation: checkout must refuse unknown plan codes
  let badPlan = false;
  try {
    await billingService.createCheckoutSession(
      { planCode: "not-a-real-plan-code" },
      {
        userId: admin.id,
        email: admin.email,
        role: admin.role.code,
      },
    );
  } catch (error) {
    badPlan = true;
    assert.ok(error instanceof BillingError);
    assert.equal(
      (error as BillingError).code,
      isStripePaymentsEnabled()
        ? BILLING_ERROR_CODES.PLAN_NOT_FOUND
        : BILLING_ERROR_CODES.PAYMENTS_DISABLED,
    );
  }
  assert.equal(badPlan, true);

  // Webhook signature validation (when secret configured)
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (secret && process.env.STRIPE_SECRET_KEY?.trim()) {
    let rejected = false;
    try {
      await billingService.handleStripeWebhook(
        Buffer.from("{}"),
        "t=1,v1=invalid",
      );
    } catch (error) {
      rejected = true;
      assert.ok(error instanceof BillingError);
      assert.equal(
        (error as BillingError).code,
        BILLING_ERROR_CODES.WEBHOOK_SIGNATURE_INVALID,
      );
    }
    assert.equal(rejected, true, "invalid webhook signature must fail");
  } else {
    console.log("webhook signature test skipped (STRIPE_WEBHOOK_SECRET not set)");
  }

  // Idempotency ledger table exists
  const ledgerCount = await prisma.stripeWebhookEvent.count();
  assert.ok(ledgerCount >= 0);

  // Fake idempotent insert then duplicate detection path
  const fakeId = `evt_verify_${Date.now()}`;
  await billingRepository.recordWebhookEvent(fakeId, "ping.verify");
  const again = await billingRepository.findWebhookEvent(fakeId);
  assert.ok(again);

  const runtime = describeStripeRuntime();
  console.log(
    `verify-billing-subscription: OK mode=${getStripeMode()} paymentsEnabled=${runtime.paymentsEnabled} plans=${plans.length} sub=${sub.planCode}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
