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
import { invoicesController } from "./invoices.controller.js";
import {
  createInvoiceSchema,
  invoiceIdParamsSchema,
  invoicePaymentNoticeSchema,
  listInvoicesQuerySchema,
  updateInvoiceSchema,
} from "./invoices.validation.js";

const invoicesRouter = Router();

invoicesRouter.use(authenticate);

invoicesRouter.get(
  "/",
  authorizePermissions(PERMISSIONS.INVOICES_READ),
  rateLimit({
    name: "invoices.list",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(listInvoicesQuerySchema, "query"),
  asyncHandler((req, res) => invoicesController.list(req, res)),
);

invoicesRouter.get(
  "/stats",
  authorizePermissions(PERMISSIONS.INVOICES_READ),
  rateLimit({
    name: "invoices.stats",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => invoicesController.stats(req, res)),
);

invoicesRouter.get(
  "/:id/pdf",
  authorizePermissions(PERMISSIONS.INVOICES_READ),
  rateLimit({
    name: "invoices.pdf",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(invoiceIdParamsSchema, "params"),
  asyncHandler((req, res) => invoicesController.pdf(req, res)),
);

invoicesRouter.post(
  "/:id/payment-notice",
  authorizePermissions(PERMISSIONS.INVOICES_READ),
  authorizeRoles(UserRole.CLIENT),
  rateLimit({
    name: "invoices.payment_notice",
    max: 20,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(invoiceIdParamsSchema, "params"),
  validate(invoicePaymentNoticeSchema, "body"),
  asyncHandler((req, res) => invoicesController.reportPaymentNotice(req, res)),
);

invoicesRouter.get(
  "/:id",
  authorizePermissions(PERMISSIONS.INVOICES_READ),
  rateLimit({
    name: "invoices.get",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(invoiceIdParamsSchema, "params"),
  asyncHandler((req, res) => invoicesController.getById(req, res)),
);

invoicesRouter.post(
  "/",
  authorizePermissions(PERMISSIONS.INVOICES_WRITE),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "invoices.create",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(createInvoiceSchema),
  asyncHandler((req, res) => invoicesController.create(req, res)),
);

invoicesRouter.patch(
  "/:id",
  authorizePermissions(PERMISSIONS.INVOICES_WRITE),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "invoices.update",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(invoiceIdParamsSchema, "params"),
  validate(updateInvoiceSchema),
  asyncHandler((req, res) => invoicesController.update(req, res)),
);

invoicesRouter.delete(
  "/:id",
  authorizePermissions(PERMISSIONS.INVOICES_DELETE),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "invoices.delete",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(invoiceIdParamsSchema, "params"),
  asyncHandler((req, res) => invoicesController.remove(req, res)),
);

export { invoicesRouter };
