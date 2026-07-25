import type { Request, Response } from "express";

import type {
  CreateBackupInput,
  CreateIntegrationCredentialInput,
  RequestAccountDeletionInput,
  UpdateAiSettingsInput,
  UpdateAppearanceSettingsInput,
  UpdateBillingSettingsInput,
  UpdateCompanySettingsInput,
  UpdateIntegrationCredentialInput,
  UpdateLocaleSettingsInput,
  UpdateNotificationSettingsInput,
  UpdateSecurityPreferencesInput,
  UpdateSettingsProfileInput,
} from "@enterprise/shared";

import { successResponse } from "../../shared/utils/api-response.js";
import { SETTINGS_ERROR_CODES, SettingsError } from "./settings.errors.js";
import { settingsService } from "./settings.service.js";
import type { SettingsActor, SettingsRequestContext } from "./settings.types.js";

function getActor(req: Request): SettingsActor {
  if (!req.auth) {
    throw new SettingsError(
      "Authentication required",
      401,
      SETTINGS_ERROR_CODES.FORBIDDEN,
    );
  }
  return {
    userId: req.auth.userId,
    role: req.auth.role,
    email: req.auth.email,
    permissions: req.auth.permissions,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? null,
  };
}

function getContext(req: Request): SettingsRequestContext {
  return {
    ipAddress: req.ip ?? "0.0.0.0",
    userAgent: req.get("user-agent") ?? "unknown",
  };
}

export class SettingsController {
  async overview(req: Request, res: Response) {
    const result = await settingsService.getOverview(getActor(req));
    res.json(successResponse(result, "Settings overview retrieved"));
  }

  async updateProfile(req: Request, res: Response) {
    const result = await settingsService.updateProfile(
      req.body as UpdateSettingsProfileInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async requestDeletion(req: Request, res: Response) {
    const result = await settingsService.requestAccountDeletion(
      req.body as RequestAccountDeletionInput,
      getActor(req),
      getContext(req),
    );
    res.status(201).json(successResponse(result, result.message));
  }

  async updateCompany(req: Request, res: Response) {
    const result = await settingsService.updateCompany(
      req.body as UpdateCompanySettingsInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async updateAppearance(req: Request, res: Response) {
    const result = await settingsService.updateAppearance(
      req.body as UpdateAppearanceSettingsInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async updateLocale(req: Request, res: Response) {
    const result = await settingsService.updateLocale(
      req.body as UpdateLocaleSettingsInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async updateNotifications(req: Request, res: Response) {
    const result = await settingsService.updateNotifications(
      req.body as UpdateNotificationSettingsInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async updateAi(req: Request, res: Response) {
    const result = await settingsService.updateAi(
      req.body as UpdateAiSettingsInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async updateSecurity(req: Request, res: Response) {
    const result = await settingsService.updateSecurityPreferences(
      req.body as UpdateSecurityPreferencesInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async resetPreferences(req: Request, res: Response) {
    const result = await settingsService.resetPreferences(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async listApiKeys(req: Request, res: Response) {
    const result = await settingsService.listApiKeys(getActor(req));
    res.json(successResponse(result, "API keys retrieved"));
  }

  async createApiKey(req: Request, res: Response) {
    const result = await settingsService.createApiKey(
      req.body as CreateIntegrationCredentialInput,
      getActor(req),
      getContext(req),
    );
    res.status(201).json(successResponse(result, result.message));
  }

  async updateApiKey(req: Request, res: Response) {
    const result = await settingsService.updateApiKey(
      String(req.params.id),
      req.body as UpdateIntegrationCredentialInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async deleteApiKey(req: Request, res: Response) {
    const result = await settingsService.deleteApiKey(
      String(req.params.id),
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async listBackups(req: Request, res: Response) {
    const result = await settingsService.listBackups(getActor(req));
    res.json(successResponse(result, "Backups retrieved"));
  }

  async createBackup(req: Request, res: Response) {
    const result = await settingsService.createBackup(
      (req.body ?? {}) as CreateBackupInput,
      getActor(req),
      getContext(req),
    );
    res.status(201).json(successResponse(result, result.message));
  }

  async getBilling(req: Request, res: Response) {
    const result = await settingsService.getBilling(getActor(req));
    res.json(successResponse(result, "Billing settings retrieved"));
  }

  async updateBilling(req: Request, res: Response) {
    const result = await settingsService.updateBilling(
      req.body as UpdateBillingSettingsInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async getStorage(req: Request, res: Response) {
    const result = await settingsService.getStorage(getActor(req));
    res.json(successResponse(result, "Storage settings retrieved"));
  }
}

export const settingsController = new SettingsController();
