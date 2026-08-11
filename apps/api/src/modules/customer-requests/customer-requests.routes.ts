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
import { customerRequestsController } from "./customer-requests.controller.js";
import {
  addCustomerRequestAttachmentSchema,
  approveCustomerRequestSchema,
  clarifyCustomerRequestSchema,
  convertCustomerRequestSchema,
  createCustomerRequestSchema,
  customerRequestIdParamsSchema,
  listCustomerRequestsQuerySchema,
  rejectCustomerRequestSchema,
  startCustomerRequestReviewSchema,
  updateCustomerRequestSchema,
} from "./customer-requests.validation.js";

const customerRequestsRouter = Router();

customerRequestsRouter.use(authenticate);

customerRequestsRouter.get(
  "/",
  authorizePermissions(PERMISSIONS.CUSTOMER_REQUESTS_READ),
  rateLimit({
    name: "customer-requests.list",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(listCustomerRequestsQuerySchema, "query"),
  asyncHandler((req, res) => customerRequestsController.list(req, res)),
);

customerRequestsRouter.get(
  "/:id",
  authorizePermissions(PERMISSIONS.CUSTOMER_REQUESTS_READ),
  rateLimit({
    name: "customer-requests.get",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(customerRequestIdParamsSchema, "params"),
  asyncHandler((req, res) => customerRequestsController.getById(req, res)),
);

customerRequestsRouter.post(
  "/",
  authorizePermissions(PERMISSIONS.CUSTOMER_REQUESTS_CREATE),
  authorizeRoles(UserRole.CLIENT),
  rateLimit({
    name: "customer-requests.create",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(createCustomerRequestSchema),
  asyncHandler((req, res) => customerRequestsController.create(req, res)),
);

customerRequestsRouter.patch(
  "/:id",
  authorizePermissions(PERMISSIONS.CUSTOMER_REQUESTS_CREATE),
  authorizeRoles(UserRole.CLIENT),
  rateLimit({
    name: "customer-requests.update",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(customerRequestIdParamsSchema, "params"),
  validate(updateCustomerRequestSchema),
  asyncHandler((req, res) => customerRequestsController.update(req, res)),
);

customerRequestsRouter.post(
  "/:id/submit",
  authorizePermissions(PERMISSIONS.CUSTOMER_REQUESTS_CREATE),
  authorizeRoles(UserRole.CLIENT),
  rateLimit({
    name: "customer-requests.submit",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(customerRequestIdParamsSchema, "params"),
  asyncHandler((req, res) => customerRequestsController.submit(req, res)),
);

customerRequestsRouter.post(
  "/:id/withdraw",
  authorizePermissions(PERMISSIONS.CUSTOMER_REQUESTS_CREATE),
  authorizeRoles(UserRole.CLIENT),
  rateLimit({
    name: "customer-requests.withdraw",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(customerRequestIdParamsSchema, "params"),
  asyncHandler((req, res) => customerRequestsController.withdraw(req, res)),
);

customerRequestsRouter.post(
  "/:id/attachments",
  authorizePermissions(PERMISSIONS.CUSTOMER_REQUESTS_CREATE),
  authorizeRoles(UserRole.CLIENT),
  rateLimit({
    name: "customer-requests.attachments",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(customerRequestIdParamsSchema, "params"),
  validate(addCustomerRequestAttachmentSchema),
  asyncHandler((req, res) =>
    customerRequestsController.addAttachment(req, res),
  ),
);

customerRequestsRouter.post(
  "/:id/review",
  authorizePermissions(PERMISSIONS.CUSTOMER_REQUESTS_REVIEW),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "customer-requests.review",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(customerRequestIdParamsSchema, "params"),
  validate(startCustomerRequestReviewSchema),
  asyncHandler((req, res) => customerRequestsController.startReview(req, res)),
);

customerRequestsRouter.post(
  "/:id/clarification",
  authorizePermissions(PERMISSIONS.CUSTOMER_REQUESTS_REVIEW),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "customer-requests.clarification",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(customerRequestIdParamsSchema, "params"),
  validate(clarifyCustomerRequestSchema),
  asyncHandler((req, res) =>
    customerRequestsController.requestClarification(req, res),
  ),
);

customerRequestsRouter.post(
  "/:id/approve",
  authorizePermissions(PERMISSIONS.CUSTOMER_REQUESTS_REVIEW),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "customer-requests.approve",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(customerRequestIdParamsSchema, "params"),
  validate(approveCustomerRequestSchema),
  asyncHandler((req, res) => customerRequestsController.approve(req, res)),
);

customerRequestsRouter.post(
  "/:id/reject",
  authorizePermissions(PERMISSIONS.CUSTOMER_REQUESTS_REVIEW),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "customer-requests.reject",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(customerRequestIdParamsSchema, "params"),
  validate(rejectCustomerRequestSchema),
  asyncHandler((req, res) => customerRequestsController.reject(req, res)),
);

customerRequestsRouter.post(
  "/:id/convert",
  authorizePermissions(PERMISSIONS.CUSTOMER_REQUESTS_REVIEW),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "customer-requests.convert",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(customerRequestIdParamsSchema, "params"),
  validate(convertCustomerRequestSchema),
  asyncHandler((req, res) => customerRequestsController.convert(req, res)),
);

export { customerRequestsRouter };
