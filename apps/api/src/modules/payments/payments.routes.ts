import { Router } from "express";
import { z } from "zod";

import { PERMISSIONS, RATE_LIMIT, UserRole, uuidSchema } from "@enterprise/shared";

import {
  authenticate,
  authorizePermissions,
  authorizeRoles,
} from "../../shared/authorization.js";
import {
  rateLimit,
  rateLimitByIp,
  rateLimitByUser,
} from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { paymentsController } from "./payments.controller.js";
import {
  bankTransferSubmitSchema,
  createPaymentRefundSchema,
  decidePaymentRefundSchema,
  initiateProviderPaymentSchema,
  listPaymentsQuerySchema,
  paymentIdParamsSchema,
  paymentMethodParamsSchema,
  rejectPaymentSchema,
  updatePaymentMethodConfigSchema,
  verifyPaymentSchema,
  walletPaymentNoticeSchema,
} from "./payments.validation.js";

const paymentsRouter = Router();

paymentsRouter.get(
  "/callbacks/jazzcash",
  rateLimit({
    name: "payments.callback.jazzcash",
    max: 120,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByIp,
  }),
  asyncHandler((req, res) => paymentsController.jazzCashCallback(req, res)),
);

paymentsRouter.post(
  "/callbacks/jazzcash",
  rateLimit({
    name: "payments.callback.jazzcash.post",
    max: 120,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByIp,
  }),
  asyncHandler((req, res) => paymentsController.jazzCashCallback(req, res)),
);

paymentsRouter.get(
  "/callbacks/easypaisa",
  rateLimit({
    name: "payments.callback.easypaisa",
    max: 120,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByIp,
  }),
  asyncHandler((req, res) => paymentsController.easyPaisaCallback(req, res)),
);

paymentsRouter.post(
  "/callbacks/easypaisa",
  rateLimit({
    name: "payments.callback.easypaisa.post",
    max: 120,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByIp,
  }),
  asyncHandler((req, res) => paymentsController.easyPaisaCallback(req, res)),
);

paymentsRouter.use(authenticate);

paymentsRouter.get(
  "/methods",
  authorizePermissions(PERMISSIONS.PAYMENTS_READ),
  rateLimit({
    name: "payments.methods",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => paymentsController.listMethods(req, res)),
);

paymentsRouter.patch(
  "/methods/:method",
  authorizePermissions(PERMISSIONS.PAYMENTS_CONFIGURE),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "payments.methods.update",
    max: 40,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(paymentMethodParamsSchema, "params"),
  validate(updatePaymentMethodConfigSchema),
  asyncHandler((req, res) => paymentsController.updateMethod(req, res)),
);

paymentsRouter.get(
  "/",
  authorizePermissions(PERMISSIONS.PAYMENTS_READ),
  rateLimit({
    name: "payments.list",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(listPaymentsQuerySchema, "query"),
  asyncHandler((req, res) => paymentsController.list(req, res)),
);

paymentsRouter.post(
  "/bank-transfer",
  authorizePermissions(PERMISSIONS.PAYMENTS_PAY),
  authorizeRoles(UserRole.CLIENT),
  rateLimit({
    name: "payments.bank",
    max: 20,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(bankTransferSubmitSchema),
  asyncHandler((req, res) => paymentsController.submitBankTransfer(req, res)),
);

paymentsRouter.post(
  "/wallet-notice",
  authorizePermissions(PERMISSIONS.PAYMENTS_PAY),
  authorizeRoles(UserRole.CLIENT),
  rateLimit({
    name: "payments.wallet",
    max: 20,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(walletPaymentNoticeSchema),
  asyncHandler((req, res) => paymentsController.submitWalletNotice(req, res)),
);

paymentsRouter.post(
  "/jazzcash/initiate",
  authorizePermissions(PERMISSIONS.PAYMENTS_PAY),
  authorizeRoles(UserRole.CLIENT),
  rateLimit({
    name: "payments.jazzcash.initiate",
    max: 20,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(initiateProviderPaymentSchema),
  asyncHandler((req, res) => paymentsController.initiateJazzCash(req, res)),
);

paymentsRouter.post(
  "/easypaisa/initiate",
  authorizePermissions(PERMISSIONS.PAYMENTS_PAY),
  authorizeRoles(UserRole.CLIENT),
  rateLimit({
    name: "payments.easypaisa.initiate",
    max: 20,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(initiateProviderPaymentSchema),
  asyncHandler((req, res) => paymentsController.initiateEasyPaisa(req, res)),
);

paymentsRouter.get(
  "/:id/jazzcash/checkout",
  authorizePermissions(PERMISSIONS.PAYMENTS_PAY),
  authorizeRoles(UserRole.CLIENT),
  rateLimit({
    name: "payments.jazzcash.checkout",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(paymentIdParamsSchema, "params"),
  asyncHandler((req, res) => paymentsController.jazzCashCheckout(req, res)),
);

paymentsRouter.get(
  "/:id/easypaisa/checkout",
  authorizePermissions(PERMISSIONS.PAYMENTS_PAY),
  authorizeRoles(UserRole.CLIENT),
  rateLimit({
    name: "payments.easypaisa.checkout",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(paymentIdParamsSchema, "params"),
  asyncHandler((req, res) => paymentsController.easyPaisaCheckout(req, res)),
);

paymentsRouter.post(
  "/:id/verify",
  authorizePermissions(PERMISSIONS.PAYMENTS_VERIFY),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "payments.verify",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(paymentIdParamsSchema, "params"),
  validate(verifyPaymentSchema),
  asyncHandler((req, res) => paymentsController.verify(req, res)),
);

paymentsRouter.post(
  "/:id/reject",
  authorizePermissions(PERMISSIONS.PAYMENTS_VERIFY),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "payments.reject",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(paymentIdParamsSchema, "params"),
  validate(rejectPaymentSchema),
  asyncHandler((req, res) => paymentsController.reject(req, res)),
);

paymentsRouter.post(
  "/:id/refunds",
  authorizePermissions(PERMISSIONS.PAYMENTS_REFUND),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "payments.refund.create",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(paymentIdParamsSchema, "params"),
  validate(createPaymentRefundSchema),
  asyncHandler((req, res) => paymentsController.createRefund(req, res)),
);

paymentsRouter.post(
  "/:id/refunds/:refundId",
  authorizePermissions(PERMISSIONS.PAYMENTS_REFUND),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "payments.refund.decide",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(
    z.object({ id: uuidSchema, refundId: uuidSchema }),
    "params",
  ),
  validate(decidePaymentRefundSchema),
  asyncHandler((req, res) => paymentsController.decideRefund(req, res)),
);

paymentsRouter.get(
  "/:id",
  authorizePermissions(PERMISSIONS.PAYMENTS_READ),
  rateLimit({
    name: "payments.get",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(paymentIdParamsSchema, "params"),
  asyncHandler((req, res) => paymentsController.getById(req, res)),
);

export { paymentsRouter };
