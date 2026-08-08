import type { Request, Response } from "express";

import type {
  CreateBackupInput,
  CreateIntegrationCredentialInput,
  CreateProfileDocumentMetaInput,
  ProfileDocumentIdParamsInput,
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
import {
  applyFileDeliveryHeaders,
  resolveFileDeliveryHeaders,
} from "../files/files.preview-security.js";
import { cleanupRequestTempUploads } from "../files/files.upload-middleware.js";
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

function mapUploadFile(file: Express.Multer.File) {
  return {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    tempPath: file.path,
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

  async uploadAvatar(req: Request, res: Response) {
    try {
      const uploaded = req.files as Express.Multer.File[] | undefined;
      const file = uploaded?.[0];
      if (!file) {
        throw new SettingsError(
          "Profile picture file is required",
          400,
          SETTINGS_ERROR_CODES.VALIDATION,
        );
      }

      const result = await settingsService.uploadAvatar(
        mapUploadFile(file),
        getActor(req),
        getContext(req),
      );
      res.json(successResponse(result, result.message));
    } finally {
      await cleanupRequestTempUploads(req);
    }
  }

  async removeAvatar(req: Request, res: Response) {
    const result = await settingsService.removeAvatar(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async listProfileDocuments(req: Request, res: Response) {
    const result = await settingsService.listProfileDocuments(getActor(req));
    res.json(successResponse(result, "Profile documents retrieved"));
  }

  async uploadProfileDocument(req: Request, res: Response) {
    try {
      const uploaded = req.files as Express.Multer.File[] | undefined;
      const file = uploaded?.[0];
      if (!file) {
        throw new SettingsError(
          "Document file is required",
          400,
          SETTINGS_ERROR_CODES.VALIDATION,
        );
      }

      const meta: CreateProfileDocumentMetaInput = {
        type: (typeof req.body?.type === "string"
          ? req.body.type
          : "OTHER") as CreateProfileDocumentMetaInput["type"],
        title:
          typeof req.body?.title === "string" ? req.body.title : undefined,
        notes:
          typeof req.body?.notes === "string" ? req.body.notes : undefined,
      };

      const result = await settingsService.uploadProfileDocument(
        mapUploadFile(file),
        meta,
        getActor(req),
        getContext(req),
      );
      res.status(201).json(successResponse(result, result.message));
    } finally {
      await cleanupRequestTempUploads(req);
    }
  }

  async deleteProfileDocument(req: Request, res: Response) {
    const params = req.params as unknown as ProfileDocumentIdParamsInput;
    const result = await settingsService.deleteProfileDocument(
      params.id,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async downloadProfileDocument(req: Request, res: Response) {
    const params = req.params as unknown as ProfileDocumentIdParamsInput;
    const result = await settingsService.downloadOwnedProfileFile(
      params.id,
      getActor(req),
    );

    const headers = resolveFileDeliveryHeaders({
      mode: "download",
      extension: result.file.extension,
      fileName: result.file.originalName || result.file.name,
    });
    applyFileDeliveryHeaders(res, headers, result.sizeBytes);
    result.stream.pipe(res);
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
