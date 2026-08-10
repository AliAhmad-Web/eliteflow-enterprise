import { Router } from "express";

import {
  PERMISSIONS,
  RATE_LIMIT,
  cancelSubscriptionSchema,
  createCheckoutSessionSchema,
} from "@enterprise/shared";

import {
  authenticate,
  authorizePermissions,
} from "../../shared/authorization.js";
import {
  rateLimit,
  rateLimitByIp,
  rateLimitByUser,
} from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { billingController } from "./billing.controller.js";

const billingRouter = Router();

/** Public health-ish runtime is admin-only; plans list requires settings manage. */
billingRouter.get(
  "/plans",
  authenticate,
  authorizePermissions(PERMISSIONS.SETTINGS_MANAGE),
  rateLimit({
    name: "billing.plans",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => billingController.listPlans(req, res)),
);

billingRouter.get(
  "/subscription",
  authenticate,
  // CLIENT may view limited org subscription; ADMIN manages via SETTINGS_MANAGE below.
  // authorizePermissions uses OR of none — controller enforces role allow-list.
  rateLimit({
    name: "billing.subscription",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => billingController.getSubscription(req, res)),
);

billingRouter.get(
  "/events",
  authenticate,
  authorizePermissions(PERMISSIONS.SETTINGS_MANAGE),
  rateLimit({
    name: "billing.events",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => billingController.listEvents(req, res)),
);

billingRouter.get(
  "/runtime",
  authenticate,
  authorizePermissions(PERMISSIONS.SETTINGS_MANAGE),
  rateLimit({
    name: "billing.runtime",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => billingController.getRuntime(req, res)),
);

billingRouter.post(
  "/checkout",
  authenticate,
  authorizePermissions(PERMISSIONS.SETTINGS_MANAGE),
  rateLimit({
    name: "billing.checkout",
    max: 20,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(createCheckoutSessionSchema),
  asyncHandler((req, res) => billingController.createCheckout(req, res)),
);

billingRouter.post(
  "/cancel",
  authenticate,
  authorizePermissions(PERMISSIONS.SETTINGS_MANAGE),
  rateLimit({
    name: "billing.cancel",
    max: 20,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(cancelSubscriptionSchema),
  asyncHandler((req, res) => billingController.cancel(req, res)),
);

billingRouter.post(
  "/reactivate",
  authenticate,
  authorizePermissions(PERMISSIONS.SETTINGS_MANAGE),
  rateLimit({
    name: "billing.reactivate",
    max: 20,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => billingController.reactivate(req, res)),
);

billingRouter.post(
  "/portal-session",
  authenticate,
  authorizePermissions(PERMISSIONS.SETTINGS_MANAGE),
  rateLimit({
    name: "billing.portal",
    max: 20,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => billingController.createPortal(req, res)),
);

/**
 * Stripe webhooks — mounted with raw body parser in app.ts.
 * Signature verified inside controller/service (Stripe-Signature).
 */
billingRouter.post(
  "/webhooks/stripe",
  rateLimit({
    name: "billing.webhooks.stripe",
    max: 300,
    windowMs: 60 * 1000,
    keyGenerator: rateLimitByIp,
  }),
  asyncHandler((req, res) => billingController.stripeWebhook(req, res)),
);

export { billingRouter };
