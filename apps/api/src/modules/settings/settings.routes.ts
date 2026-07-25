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
import { settingsController } from "./settings.controller.js";
import {
  createBackupSchema,
  createIntegrationCredentialSchema,
  integrationCredentialIdParamsSchema,
  requestAccountDeletionSchema,
  updateAiSettingsSchema,
  updateAppearanceSettingsSchema,
  updateBillingSettingsSchema,
  updateCompanySettingsSchema,
  updateIntegrationCredentialSchema,
  updateLocaleSettingsSchema,
  updateNotificationSettingsSchema,
  updateSecurityPreferencesSchema,
  updateSettingsProfileSchema,
} from "./settings.validation.js";

const settingsRouter = Router();
settingsRouter.use(authenticate);

const readLimit = rateLimit({
  name: "settings.read",
  ...RATE_LIMIT.GLOBAL_API,
  keyGenerator: rateLimitByUser,
});

const writeLimit = rateLimit({
  name: "settings.write",
  max: 40,
  windowMs: 15 * 60 * 1000,
  keyGenerator: rateLimitByUser,
});

settingsRouter.get(
  "/overview",
  readLimit,
  asyncHandler((req, res) => settingsController.overview(req, res)),
);

settingsRouter.patch(
  "/profile",
  writeLimit,
  validate(updateSettingsProfileSchema),
  asyncHandler((req, res) => settingsController.updateProfile(req, res)),
);

settingsRouter.post(
  "/profile/delete-request",
  writeLimit,
  validate(requestAccountDeletionSchema),
  asyncHandler((req, res) => settingsController.requestDeletion(req, res)),
);

settingsRouter.put(
  "/company",
  authorizePermissions(PERMISSIONS.SETTINGS_MANAGE),
  writeLimit,
  validate(updateCompanySettingsSchema),
  asyncHandler((req, res) => settingsController.updateCompany(req, res)),
);

settingsRouter.put(
  "/appearance",
  writeLimit,
  validate(updateAppearanceSettingsSchema),
  asyncHandler((req, res) => settingsController.updateAppearance(req, res)),
);

settingsRouter.put(
  "/locale",
  writeLimit,
  validate(updateLocaleSettingsSchema),
  asyncHandler((req, res) => settingsController.updateLocale(req, res)),
);

settingsRouter.put(
  "/language",
  writeLimit,
  validate(updateLocaleSettingsSchema),
  asyncHandler((req, res) => settingsController.updateLocale(req, res)),
);

settingsRouter.put(
  "/notifications",
  writeLimit,
  validate(updateNotificationSettingsSchema),
  asyncHandler((req, res) => settingsController.updateNotifications(req, res)),
);

settingsRouter.put(
  "/ai",
  writeLimit,
  validate(updateAiSettingsSchema),
  asyncHandler((req, res) => settingsController.updateAi(req, res)),
);

settingsRouter.put(
  "/security",
  writeLimit,
  validate(updateSecurityPreferencesSchema),
  asyncHandler((req, res) => settingsController.updateSecurity(req, res)),
);

settingsRouter.post(
  "/preferences/reset",
  writeLimit,
  asyncHandler((req, res) => settingsController.resetPreferences(req, res)),
);

settingsRouter.get(
  "/api-keys",
  authorizePermissions(PERMISSIONS.SETTINGS_MANAGE),
  readLimit,
  asyncHandler((req, res) => settingsController.listApiKeys(req, res)),
);

settingsRouter.post(
  "/api-keys",
  authorizePermissions(PERMISSIONS.SETTINGS_MANAGE),
  writeLimit,
  validate(createIntegrationCredentialSchema),
  asyncHandler((req, res) => settingsController.createApiKey(req, res)),
);

settingsRouter.patch(
  "/api-keys/:id",
  authorizePermissions(PERMISSIONS.SETTINGS_MANAGE),
  writeLimit,
  validate(integrationCredentialIdParamsSchema, "params"),
  validate(updateIntegrationCredentialSchema),
  asyncHandler((req, res) => settingsController.updateApiKey(req, res)),
);

settingsRouter.delete(
  "/api-keys/:id",
  authorizePermissions(PERMISSIONS.SETTINGS_MANAGE),
  writeLimit,
  validate(integrationCredentialIdParamsSchema, "params"),
  asyncHandler((req, res) => settingsController.deleteApiKey(req, res)),
);

settingsRouter.get(
  "/backups",
  authorizePermissions(PERMISSIONS.SETTINGS_MANAGE),
  readLimit,
  asyncHandler((req, res) => settingsController.listBackups(req, res)),
);

settingsRouter.post(
  "/backups",
  authorizePermissions(PERMISSIONS.SETTINGS_MANAGE),
  writeLimit,
  validate(createBackupSchema),
  asyncHandler((req, res) => settingsController.createBackup(req, res)),
);

settingsRouter.get(
  "/billing",
  authorizePermissions(PERMISSIONS.SETTINGS_MANAGE),
  readLimit,
  asyncHandler((req, res) => settingsController.getBilling(req, res)),
);

settingsRouter.patch(
  "/billing",
  authorizePermissions(PERMISSIONS.SETTINGS_MANAGE),
  writeLimit,
  validate(updateBillingSettingsSchema),
  asyncHandler((req, res) => settingsController.updateBilling(req, res)),
);

settingsRouter.get(
  "/storage",
  authorizePermissions(PERMISSIONS.SETTINGS_MANAGE),
  readLimit,
  asyncHandler((req, res) => settingsController.getStorage(req, res)),
);

export { settingsRouter };
