import { Router } from "express";

import { PERMISSIONS, RATE_LIMIT } from "@enterprise/shared";

import {
  authenticate,
  authorizePermissions,
} from "../../shared/authorization.js";
import {
  rateLimit,
  rateLimitByUser,
} from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { reportsController } from "./reports.controller.js";
import {
  analyticsQuerySchema,
  createSavedReportSchema,
  exportReportSchema,
  savedReportIdParamsSchema,
  updateSavedReportSchema,
} from "./reports.validation.js";

const reportsRouter = Router();
reportsRouter.use(authenticate);

const readLimit = rateLimit({
  name: "reports.read",
  ...RATE_LIMIT.GLOBAL_API,
  keyGenerator: rateLimitByUser,
});

const writeLimit = rateLimit({
  name: "reports.write",
  max: 40,
  windowMs: 15 * 60 * 1000,
  keyGenerator: rateLimitByUser,
});

reportsRouter.get(
  "/analytics",
  authorizePermissions(PERMISSIONS.REPORTS_READ),
  readLimit,
  validate(analyticsQuerySchema, "query"),
  asyncHandler((req, res) => reportsController.analytics(req, res)),
);

reportsRouter.get(
  "/insights",
  authorizePermissions(PERMISSIONS.REPORTS_READ),
  readLimit,
  validate(analyticsQuerySchema, "query"),
  asyncHandler((req, res) => reportsController.insights(req, res)),
);

reportsRouter.get(
  "/templates",
  authorizePermissions(PERMISSIONS.REPORTS_READ),
  readLimit,
  asyncHandler((req, res) => reportsController.templates(req, res)),
);

reportsRouter.get(
  "/saved",
  authorizePermissions(PERMISSIONS.REPORTS_READ),
  readLimit,
  asyncHandler((req, res) => reportsController.listSaved(req, res)),
);

reportsRouter.post(
  "/saved",
  authorizePermissions(PERMISSIONS.REPORTS_READ),
  writeLimit,
  validate(createSavedReportSchema),
  asyncHandler((req, res) => reportsController.createSaved(req, res)),
);

reportsRouter.patch(
  "/saved/:id",
  authorizePermissions(PERMISSIONS.REPORTS_READ),
  writeLimit,
  validate(savedReportIdParamsSchema, "params"),
  validate(updateSavedReportSchema),
  asyncHandler((req, res) => reportsController.updateSaved(req, res)),
);

reportsRouter.delete(
  "/saved/:id",
  authorizePermissions(PERMISSIONS.REPORTS_READ),
  writeLimit,
  validate(savedReportIdParamsSchema, "params"),
  asyncHandler((req, res) => reportsController.deleteSaved(req, res)),
);

reportsRouter.post(
  "/export",
  authorizePermissions(PERMISSIONS.REPORTS_EXPORT),
  writeLimit,
  validate(exportReportSchema),
  asyncHandler((req, res) => reportsController.export(req, res)),
);

export { reportsRouter };
