import { Router } from "express";

import { PERMISSIONS, RATE_LIMIT, UserRole } from "@enterprise/shared";

import {
  authenticate,
  authorizePermissions,
  authorizeRoles,
} from "../../shared/authorization.js";
import {
  rateLimit,
  rateLimitByUser,
} from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { quotesController } from "./quotes.controller.js";
import {
  createQuoteSchema,
  generateQuoteInvoicesSchema,
  listQuotesQuerySchema,
  quoteIdParamsSchema,
  rejectQuoteSchema,
  selectQuotePaymentModelSchema,
  updateQuoteSchema,
} from "./quotes.validation.js";

const quotesRouter = Router();

quotesRouter.use(authenticate);

quotesRouter.get(
  "/",
  authorizePermissions(PERMISSIONS.QUOTES_READ),
  rateLimit({
    name: "quotes.list",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(listQuotesQuerySchema, "query"),
  asyncHandler((req, res) => quotesController.list(req, res)),
);

quotesRouter.get(
  "/:id",
  authorizePermissions(PERMISSIONS.QUOTES_READ),
  rateLimit({
    name: "quotes.get",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(quoteIdParamsSchema, "params"),
  asyncHandler((req, res) => quotesController.getById(req, res)),
);

quotesRouter.post(
  "/",
  authorizePermissions(PERMISSIONS.QUOTES_WRITE),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "quotes.create",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(createQuoteSchema),
  asyncHandler((req, res) => quotesController.create(req, res)),
);

quotesRouter.patch(
  "/:id",
  authorizePermissions(PERMISSIONS.QUOTES_WRITE),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "quotes.update",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(quoteIdParamsSchema, "params"),
  validate(updateQuoteSchema),
  asyncHandler((req, res) => quotesController.update(req, res)),
);

quotesRouter.post(
  "/:id/send",
  authorizePermissions(PERMISSIONS.QUOTES_SEND),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "quotes.send",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(quoteIdParamsSchema, "params"),
  asyncHandler((req, res) => quotesController.send(req, res)),
);

quotesRouter.post(
  "/:id/approve",
  authorizePermissions(PERMISSIONS.QUOTES_APPROVE),
  authorizeRoles(UserRole.CLIENT),
  rateLimit({
    name: "quotes.approve",
    max: 20,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(quoteIdParamsSchema, "params"),
  asyncHandler((req, res) => quotesController.approve(req, res)),
);

quotesRouter.post(
  "/:id/payment-model",
  authorizePermissions(PERMISSIONS.QUOTES_APPROVE),
  authorizeRoles(UserRole.CLIENT),
  rateLimit({
    name: "quotes.selectPaymentModel",
    max: 20,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(quoteIdParamsSchema, "params"),
  validate(selectQuotePaymentModelSchema),
  asyncHandler((req, res) => quotesController.selectPaymentModel(req, res)),
);

quotesRouter.post(
  "/:id/reject",
  authorizePermissions(PERMISSIONS.QUOTES_APPROVE),
  authorizeRoles(UserRole.CLIENT),
  rateLimit({
    name: "quotes.reject",
    max: 20,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(quoteIdParamsSchema, "params"),
  validate(rejectQuoteSchema),
  asyncHandler((req, res) => quotesController.reject(req, res)),
);

quotesRouter.post(
  "/:id/cancel",
  authorizePermissions(PERMISSIONS.QUOTES_WRITE),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "quotes.cancel",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(quoteIdParamsSchema, "params"),
  asyncHandler((req, res) => quotesController.cancel(req, res)),
);

quotesRouter.post(
  "/:id/invoices",
  authorizePermissions(PERMISSIONS.INVOICES_WRITE),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "quotes.invoices",
    max: 20,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(quoteIdParamsSchema, "params"),
  validate(generateQuoteInvoicesSchema),
  asyncHandler((req, res) => quotesController.generateInvoices(req, res)),
);

export { quotesRouter };
