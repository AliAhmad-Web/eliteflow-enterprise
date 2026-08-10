import { createHash } from "node:crypto";

import type {
  CancelSubscriptionInput,
  CheckoutSessionResponse,
  CreateCheckoutSessionInput,
  OrganizationSubscriptionDto,
  SubscriptionEventDto,
  SubscriptionPlanDto,
} from "@enterprise/shared";
import type Stripe from "stripe";

import {
  BILLING_AUDIT_ACTIONS,
  logBillingAuditEvent,
} from "./billing.audit.js";
import { BILLING_ERROR_CODES, BillingError } from "./billing.errors.js";
import {
  toEventDto,
  toPlanDto,
  toSubscriptionDto,
} from "./billing.mapper.js";
import {
  billingRepository,
  mapStripeStatusToBilling,
} from "./billing.repository.js";
import {
  constructStripeEvent,
  describeStripeRuntime,
  requireStripeClient,
} from "./stripe.client.js";
import {
  getBillingCancelUrl,
  getBillingSuccessUrl,
} from "./stripe.config.js";

export interface BillingActor {
  userId: string;
  email: string;
  role: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class BillingService {
  async listPlans(): Promise<SubscriptionPlanDto[]> {
    const plans = await billingRepository.listActivePlans();
    return plans.map(toPlanDto);
  }

  async getSubscription(): Promise<OrganizationSubscriptionDto> {
    const billing = await billingRepository.getOrCreateOrganizationBilling();
    const seatsUsed = await billingRepository.countActiveUsers();
    return toSubscriptionDto(billing, seatsUsed, billing.storageUsedBytes);
  }

  async listEvents(): Promise<SubscriptionEventDto[]> {
    const billing = await billingRepository.getOrCreateOrganizationBilling();
    const events = await billingRepository.listSubscriptionEvents(billing.id);
    return events.map(toEventDto);
  }

  async getRuntime() {
    return describeStripeRuntime();
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
    actor: BillingActor,
  ): Promise<CheckoutSessionResponse> {
    const runtime = describeStripeRuntime();
    if (!runtime.paymentsEnabled) {
      throw new BillingError(
        "Stripe payments are disabled. Set STRIPE_SECRET_KEY and STRIPE_PAYMENTS_ENABLED=true to enable test/live checkout.",
        503,
        BILLING_ERROR_CODES.PAYMENTS_DISABLED,
        runtime,
      );
    }

    const plan = await billingRepository.findPlanByCode(input.planCode);
    if (!plan) {
      throw new BillingError(
        "Subscription plan not found",
        404,
        BILLING_ERROR_CODES.PLAN_NOT_FOUND,
      );
    }
    if (!plan.stripePriceId) {
      throw new BillingError(
        "Plan is not linked to a Stripe price id",
        400,
        BILLING_ERROR_CODES.PLAN_NOT_CHECKOUT_READY,
      );
    }

    // Never trust client-supplied price IDs — only catalog stripePriceId.
    const stripe = requireStripeClient();
    const billing = await billingRepository.getOrCreateOrganizationBilling();

    let customerId = billing.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: billing.billingEmail ?? actor.email,
        metadata: {
          organizationBillingId: billing.id,
          eliteflowUserId: actor.userId,
        },
      });
      customerId = customer.id;
      await billingRepository.updateOrganizationBilling(billing.id, {
        stripeCustomerId: customerId,
        billingEmail: billing.billingEmail ?? actor.email,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: input.successUrl ?? getBillingSuccessUrl(),
      cancel_url: input.cancelUrl ?? getBillingCancelUrl(),
      client_reference_id: billing.id,
      metadata: {
        organizationBillingId: billing.id,
        planCode: plan.code,
        planId: plan.id,
      },
      subscription_data: {
        trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
        metadata: {
          organizationBillingId: billing.id,
          planCode: plan.code,
        },
      },
      allow_promotion_codes: true,
    });

    await billingRepository.createSubscriptionEvent({
      organizationBillingId: billing.id,
      eventType: "checkout.session.created",
      fromStatus: billing.status,
      metadata: { sessionId: session.id, planCode: plan.code },
    });

    await logBillingAuditEvent({
      userId: actor.userId,
      action: BILLING_AUDIT_ACTIONS.CHECKOUT_CREATED,
      resourceId: billing.id,
      metadata: { planCode: plan.code, sessionId: session.id },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      url: session.url,
      sessionId: session.id,
      paymentsEnabled: true,
      mode: runtime.mode,
    };
  }

  async cancelSubscription(
    input: CancelSubscriptionInput,
    actor: BillingActor,
  ): Promise<OrganizationSubscriptionDto> {
    const stripe = requireStripeClient();
    const billing = await billingRepository.getOrCreateOrganizationBilling();
    if (!billing.stripeSubscriptionId) {
      throw new BillingError(
        "No active Stripe subscription",
        400,
        BILLING_ERROR_CODES.NO_SUBSCRIPTION,
      );
    }

    const previous = billing.status;
    const updatedSub = await stripe.subscriptions.update(
      billing.stripeSubscriptionId,
      {
        cancel_at_period_end: input.atPeriodEnd !== false,
      },
    );

    const nextStatus = mapStripeStatusToBilling(updatedSub.status);
    await billingRepository.updateOrganizationBilling(billing.id, {
      status: nextStatus,
      cancelAtPeriodEnd: Boolean(updatedSub.cancel_at_period_end),
      currentPeriodEnd: updatedSub.current_period_end
        ? new Date(updatedSub.current_period_end * 1000)
        : billing.currentPeriodEnd,
    });

    await billingRepository.createSubscriptionEvent({
      organizationBillingId: billing.id,
      eventType: "subscription.cancel_requested",
      fromStatus: previous,
      toStatus: nextStatus,
      metadata: { atPeriodEnd: input.atPeriodEnd !== false },
    });

    await logBillingAuditEvent({
      userId: actor.userId,
      action: BILLING_AUDIT_ACTIONS.SUBSCRIPTION_CANCELLED,
      resourceId: billing.id,
      metadata: { atPeriodEnd: input.atPeriodEnd !== false },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return this.getSubscription();
  }

  async reactivateSubscription(actor: BillingActor): Promise<OrganizationSubscriptionDto> {
    const stripe = requireStripeClient();
    const billing = await billingRepository.getOrCreateOrganizationBilling();
    if (!billing.stripeSubscriptionId) {
      throw new BillingError(
        "No Stripe subscription to reactivate",
        400,
        BILLING_ERROR_CODES.NO_SUBSCRIPTION,
      );
    }

    const previous = billing.status;
    const updatedSub = await stripe.subscriptions.update(
      billing.stripeSubscriptionId,
      { cancel_at_period_end: false },
    );
    const nextStatus = mapStripeStatusToBilling(updatedSub.status);
    await billingRepository.updateOrganizationBilling(billing.id, {
      status: nextStatus,
      cancelAtPeriodEnd: false,
    });

    await billingRepository.createSubscriptionEvent({
      organizationBillingId: billing.id,
      eventType: "subscription.reactivated",
      fromStatus: previous,
      toStatus: nextStatus,
    });

    await logBillingAuditEvent({
      userId: actor.userId,
      action: BILLING_AUDIT_ACTIONS.SUBSCRIPTION_REACTIVATED,
      resourceId: billing.id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return this.getSubscription();
  }

  async createCustomerPortalSession(
    actor: BillingActor,
  ): Promise<{ url: string }> {
    const stripe = requireStripeClient();
    const billing = await billingRepository.getOrCreateOrganizationBilling();
    if (!billing.stripeCustomerId) {
      throw new BillingError(
        "No Stripe customer on file",
        400,
        BILLING_ERROR_CODES.NO_SUBSCRIPTION,
      );
    }

    const web =
      process.env.WEB_APP_URL ?? process.env.FRONTEND_URL ?? "http://localhost:3000";
    const session = await stripe.billingPortal.sessions.create({
      customer: billing.stripeCustomerId,
      return_url: `${web.replace(/\/$/, "")}/settings?section=billing`,
    });

    await logBillingAuditEvent({
      userId: actor.userId,
      action: BILLING_AUDIT_ACTIONS.PORTAL_SESSION_CREATED,
      resourceId: billing.id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { url: session.url };
  }

  async handleStripeWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<{ received: true; duplicate?: boolean; type: string }> {
    const event = constructStripeEvent(rawBody, signature);
    const existing = await billingRepository.findWebhookEvent(event.id);
    if (existing) {
      await logBillingAuditEvent({
        action: BILLING_AUDIT_ACTIONS.WEBHOOK_DUPLICATE,
        metadata: { eventId: event.id, type: event.type },
      });
      return { received: true, duplicate: true, type: event.type };
    }

    const payloadHash = createHash("sha256").update(rawBody).digest("hex");
    await billingRepository.recordWebhookEvent(
      event.id,
      event.type,
      payloadHash,
    );

    await this.applyStripeEvent(event);

    await logBillingAuditEvent({
      action: BILLING_AUDIT_ACTIONS.WEBHOOK_PROCESSED,
      metadata: { eventId: event.id, type: event.type },
    });

    return { received: true, type: event.type };
  }

  private async applyStripeEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.syncFromCheckoutSession(session, event.id);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await this.syncFromSubscription(sub, event.id);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.id) {
          await billingRepository.markInvoicePaidByStripeId(
            invoice.id,
            invoice.amount_paid != null ? invoice.amount_paid / 100 : null,
          );
        }
        break;
      }
      default:
        break;
    }
  }

  private async syncFromCheckoutSession(
    session: Stripe.Checkout.Session,
    stripeEventId: string,
  ): Promise<void> {
    const billing = await billingRepository.getOrCreateOrganizationBilling();
    const planCode = session.metadata?.planCode;
    const planId = session.metadata?.planId;
    const plan = planCode
      ? await billingRepository.findPlanByCode(planCode)
      : null;

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? billing.stripeCustomerId;

    const previous = billing.status;
    await billingRepository.updateOrganizationBilling(billing.id, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: plan?.stripePriceId ?? billing.stripePriceId,
      planCode: plan?.code ?? billing.planCode,
      planName: plan?.name ?? billing.planName,
      seatsIncluded: plan?.seatsIncluded ?? billing.seatsIncluded,
      storageQuotaBytes: plan?.storageQuotaBytes ?? billing.storageQuotaBytes,
      aiCreditsIncluded: plan?.aiCreditsIncluded ?? billing.aiCreditsIncluded,
      status: "ACTIVE",
      ...(planId ? { plan: { connect: { id: planId } } } : {}),
    });

    await billingRepository.createSubscriptionEvent({
      organizationBillingId: billing.id,
      eventType: "checkout.session.completed",
      fromStatus: previous,
      toStatus: "ACTIVE",
      stripeEventId,
      metadata: { sessionId: session.id, planCode: planCode ?? null },
    });
  }

  private async syncFromSubscription(
    sub: Stripe.Subscription,
    stripeEventId: string,
  ): Promise<void> {
    const billing = await billingRepository.getOrCreateOrganizationBilling();
    if (
      billing.stripeSubscriptionId &&
      billing.stripeSubscriptionId !== sub.id &&
      billing.stripeCustomerId &&
      billing.stripeCustomerId !==
        (typeof sub.customer === "string" ? sub.customer : sub.customer?.id)
    ) {
      // Ignore unrelated subscriptions
      return;
    }

    const previous = billing.status;
    const nextStatus = mapStripeStatusToBilling(sub.status);
    const priceId = sub.items.data[0]?.price?.id ?? billing.stripePriceId;

    await billingRepository.updateOrganizationBilling(billing.id, {
      stripeSubscriptionId: sub.id,
      stripeCustomerId:
        typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      stripePriceId: priceId,
      status: nextStatus,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      currentPeriodStart: sub.current_period_start
        ? new Date(sub.current_period_start * 1000)
        : null,
      currentPeriodEnd: sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null,
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    });

    await billingRepository.createSubscriptionEvent({
      organizationBillingId: billing.id,
      eventType: `customer.subscription.${sub.status}`,
      fromStatus: previous,
      toStatus: nextStatus,
      stripeEventId,
      metadata: { subscriptionId: sub.id },
    });

    await logBillingAuditEvent({
      action: BILLING_AUDIT_ACTIONS.SUBSCRIPTION_SYNCED,
      resourceId: billing.id,
      metadata: { status: nextStatus, subscriptionId: sub.id },
    });
  }
}

export const billingService = new BillingService();
