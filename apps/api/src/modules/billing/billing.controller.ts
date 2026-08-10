import type { Request, Response } from "express";

import { UserRole } from "@enterprise/shared";

import { BillingError, BILLING_ERROR_CODES } from "./billing.errors.js";
import { billingService, type BillingActor } from "./billing.service.js";

function getActor(req: Request): BillingActor {
  if (!req.auth?.userId || !req.auth.email || !req.auth.role) {
    throw new BillingError(
      "Authentication required",
      401,
      BILLING_ERROR_CODES.FORBIDDEN,
    );
  }
  return {
    userId: req.auth.userId,
    email: req.auth.email,
    role: req.auth.role,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

function assertAdmin(actor: BillingActor): void {
  if (
    actor.role !== UserRole.ADMIN &&
    actor.role !== UserRole.SUPER_ADMIN
  ) {
    throw new BillingError(
      "Only administrators can manage subscriptions",
      403,
      BILLING_ERROR_CODES.FORBIDDEN,
    );
  }
}

export const billingController = {
  async listPlans(_req: Request, res: Response) {
    const plans = await billingService.listPlans();
    res.json({ success: true, data: { plans } });
  },

  async getSubscription(req: Request, res: Response) {
    const actor = getActor(req);
    // ADMIN: full subscription; CLIENT: limited org snapshot (no Stripe ids exposed in DTO)
    if (
      actor.role !== UserRole.ADMIN &&
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.role !== UserRole.CLIENT
    ) {
      throw new BillingError(
        "Not allowed to view subscription",
        403,
        BILLING_ERROR_CODES.FORBIDDEN,
      );
    }
    const subscription = await billingService.getSubscription();
    res.json({ success: true, data: { subscription } });
  },

  async listEvents(req: Request, res: Response) {
    assertAdmin(getActor(req));
    const events = await billingService.listEvents();
    res.json({ success: true, data: { events } });
  },

  async getRuntime(req: Request, res: Response) {
    assertAdmin(getActor(req));
    const runtime = await billingService.getRuntime();
    res.json({ success: true, data: { runtime } });
  },

  async createCheckout(req: Request, res: Response) {
    const actor = getActor(req);
    assertAdmin(actor);
    const result = await billingService.createCheckoutSession(
      req.body,
      actor,
    );
    res.status(201).json({ success: true, data: result });
  },

  async cancel(req: Request, res: Response) {
    const actor = getActor(req);
    assertAdmin(actor);
    const subscription = await billingService.cancelSubscription(
      req.body ?? { atPeriodEnd: true },
      actor,
    );
    res.json({ success: true, data: { subscription } });
  },

  async reactivate(req: Request, res: Response) {
    const actor = getActor(req);
    assertAdmin(actor);
    const subscription = await billingService.reactivateSubscription(actor);
    res.json({ success: true, data: { subscription } });
  },

  async createPortal(req: Request, res: Response) {
    const actor = getActor(req);
    assertAdmin(actor);
    const result = await billingService.createCustomerPortalSession(actor);
    res.json({ success: true, data: result });
  },

  async stripeWebhook(req: Request, res: Response) {
    const signature = req.get("stripe-signature") ?? "";
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(
          typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}),
        );

    const result = await billingService.handleStripeWebhook(
      rawBody,
      signature,
    );
    res.json(result);
  },
};
