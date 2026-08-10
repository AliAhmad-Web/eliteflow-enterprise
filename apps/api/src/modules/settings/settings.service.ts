import { createHash } from "node:crypto";

import { readFile, unlink } from "node:fs/promises";

import {
  PERMISSIONS,
  UserRole,
  buildInternalManagedFileDownloadPath,
  parseInternalManagedFileId,
  type CreateBackupInput,
  type CreateIntegrationCredentialInput,
  type CreateProfileDocumentMetaInput,
  type ProfileDocumentDto,
  type ProfileDocumentType,
  type RequestAccountDeletionInput,
  type SettingsOverviewDto,
  type UpdateAiSettingsInput,
  type UpdateAppearanceSettingsInput,
  type UpdateBillingSettingsInput,
  type UpdateCompanySettingsInput,
  type UpdateIntegrationCredentialInput,
  type UpdateLocaleSettingsInput,
  type UpdateNotificationSettingsInput,
  type UpdateSecurityPreferencesInput,
  type UpdateSettingsProfileInput,
} from "@enterprise/shared";
import { prisma } from "@enterprise/database";

import { setAiPreferredProvider, setAiProviderModel } from "../ai/providers/ai-runtime-config.js";
import { encryptionService } from "../../shared/security/encryption.service.js";
import { runVirusScanHook } from "../files/antivirus/antivirus.service.js";
import { filesRepository } from "../files/files.repository.js";
import { validateUploadFile } from "../files/files.validation-rules.js";
import { storageProvider } from "../files/storage/storage.provider.js";
import { encryptSecret } from "./settings.crypto.js";
import {
  logSettingsAuditEvent,
  SETTINGS_AUDIT_ACTIONS,
} from "./settings.audit.js";
import {
  PROFILE_AVATAR_TAG,
  PROFILE_DOCUMENT_TAG,
  SETTINGS_MESSAGES,
} from "./settings.constants.js";
import { SETTINGS_ERROR_CODES, SettingsError } from "./settings.errors.js";
import {
  toAiDto,
  toAppearanceDto,
  toBackupDto,
  toBillingDto,
  toCompanyDto,
  toCredentialDto,
  toLocaleDto,
  toNotificationDto,
  toSecurityPrefsDto,
  toSettingsProfileDto,
  toStorageDto,
} from "./settings.mapper.js";
import { settingsRepository } from "./settings.repository.js";
import type { SettingsActor, SettingsRequestContext } from "./settings.types.js";

function hasPermission(actor: SettingsActor, key: string): boolean {
  return actor.permissions.includes(key) || actor.permissions.includes("*");
}

function canManageOrg(actor: SettingsActor): boolean {
  return (
    actor.role === UserRole.SUPER_ADMIN ||
    actor.role === UserRole.ADMIN ||
    hasPermission(actor, PERMISSIONS.SETTINGS_MANAGE)
  );
}

function requireOrgAccess(actor: SettingsActor): void {
  if (!canManageOrg(actor)) {
    throw new SettingsError(
      SETTINGS_MESSAGES.FORBIDDEN,
      403,
      SETTINGS_ERROR_CODES.FORBIDDEN,
    );
  }
}

export class SettingsService {
  async getOverview(
    actor: SettingsActor,
  ): Promise<SettingsOverviewDto> {
    const orgAccess = canManageOrg(actor);
    const [user, prefs, company, billing, storage] = await Promise.all([
      settingsRepository.findUserProfile(actor.userId),
      settingsRepository.getOrCreatePreferences(actor.userId),
      orgAccess
        ? settingsRepository.getOrCreateOrganization()
        : Promise.resolve(null),
      orgAccess ? settingsRepository.getOrCreateBilling() : Promise.resolve(null),
      orgAccess ? settingsRepository.storageStats() : Promise.resolve(null),
    ]);

    if (!user) {
      throw new SettingsError(
        SETTINGS_MESSAGES.NOT_FOUND,
        404,
        SETTINGS_ERROR_CODES.NOT_FOUND,
      );
    }

    const seatsUsed = orgAccess
      ? await settingsRepository.countUsers()
      : 0;

    return {
      profile: toSettingsProfileDto(user),
      appearance: toAppearanceDto(prefs),
      locale: toLocaleDto(prefs),
      notifications: toNotificationDto(prefs),
      ai: toAiDto(prefs),
      security: toSecurityPrefsDto(prefs, user.twoFactorEnabled),
      company: company ? toCompanyDto(company) : null,
      billing:
        billing && storage
          ? toBillingDto(billing, seatsUsed, storage.usedBytes)
          : null,
      storage:
        company && storage
          ? toStorageDto({
              provider:
                company.storageProvider ??
                process.env.STORAGE_PROVIDER ??
                "local",
              quotaBytes:
                company.storageQuotaBytes ??
                billing?.storageQuotaBytes ??
                BigInt(50 * 1024 * 1024 * 1024),
              usedBytes: storage.usedBytes,
              fileCount: storage.fileCount,
            })
          : null,
      canManageOrganization: orgAccess,
    };
  }

  async updateProfile(
    input: UpdateSettingsProfileInput,
    actor: SettingsActor,
    context: SettingsRequestContext,
  ) {
    if (input.username) {
      const taken = await settingsRepository.findUsernameOwner(
        input.username,
        actor.userId,
      );
      if (taken) {
        throw new SettingsError(
          SETTINGS_MESSAGES.USERNAME_TAKEN,
          409,
          SETTINGS_ERROR_CODES.CONFLICT,
        );
      }
    }

    const dateOfBirth =
      input.dateOfBirth === undefined
        ? undefined
        : input.dateOfBirth
          ? new Date(`${input.dateOfBirth}T00:00:00.000Z`)
          : null;

    const updated = await settingsRepository.updateUserProfile(actor.userId, {
      firstName: input.firstName,
      lastName: input.lastName,
      username: input.username,
      avatarUrl: input.avatarUrl,
      phone: input.phone,
      bio: input.bio,
      designation: input.designation,
      address: input.address,
      city: input.city,
      country: input.country,
      dateOfBirth,
    });

    await settingsRepository.syncEmployeePersonalFields(actor.userId, {
      phone: input.phone,
      designation: input.designation,
      address: input.address,
      city: input.city,
      country: input.country,
      dateOfBirth,
      personalEmail: input.personalEmail,
      workLocation: input.workLocation,
      photoUrl: input.avatarUrl,
    });

    await logSettingsAuditEvent({
      userId: actor.userId,
      action: SETTINGS_AUDIT_ACTIONS.PROFILE_UPDATED,
      context,
    });

    const refreshed =
      (await settingsRepository.findUserProfile(actor.userId)) ?? updated;

    return {
      message: SETTINGS_MESSAGES.PROFILE_UPDATED,
      profile: toSettingsProfileDto(refreshed),
    };
  }

  async uploadAvatar(
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      tempPath?: string;
      buffer?: Buffer;
    },
    actor: SettingsActor,
    context: SettingsRequestContext,
  ) {
    const managed = await this.uploadPersonalManagedFile(file, actor, {
      tags: [PROFILE_AVATAR_TAG],
      folderKey: `profile/${actor.userId}/avatar`,
      imageOnly: true,
    });

    const previous = await settingsRepository.findUserProfile(actor.userId);
    const previousFileId = previous?.avatarUrl
      ? parseInternalManagedFileId(previous.avatarUrl)
      : null;

    const fileUrl = buildInternalManagedFileDownloadPath(managed.id);
    const updated = await settingsRepository.updateUserProfile(actor.userId, {
      firstName: previous?.firstName ?? "User",
      lastName: previous?.lastName ?? "",
      avatarUrl: fileUrl,
    });
    await settingsRepository.syncEmployeePersonalFields(actor.userId, {
      photoUrl: fileUrl,
    });

    if (previousFileId && previousFileId !== managed.id) {
      await settingsRepository.softDeleteManagedFile(
        previousFileId,
        actor.userId,
      );
    }

    await logSettingsAuditEvent({
      userId: actor.userId,
      action: SETTINGS_AUDIT_ACTIONS.PROFILE_AVATAR_UPDATED,
      resourceId: managed.id,
      context,
    });

    const refreshed =
      (await settingsRepository.findUserProfile(actor.userId)) ?? updated;

    return {
      message: SETTINGS_MESSAGES.AVATAR_UPDATED,
      profile: toSettingsProfileDto(refreshed),
      managedFileId: managed.id,
    };
  }

  async removeAvatar(
    actor: SettingsActor,
    context: SettingsRequestContext,
  ) {
    const previous = await settingsRepository.findUserProfile(actor.userId);
    if (!previous) {
      throw new SettingsError(
        SETTINGS_MESSAGES.NOT_FOUND,
        404,
        SETTINGS_ERROR_CODES.NOT_FOUND,
      );
    }

    const previousFileId = previous.avatarUrl
      ? parseInternalManagedFileId(previous.avatarUrl)
      : null;

    const updated = await settingsRepository.updateUserProfile(actor.userId, {
      firstName: previous.firstName,
      lastName: previous.lastName,
      avatarUrl: null,
    });
    await settingsRepository.syncEmployeePersonalFields(actor.userId, {
      photoUrl: null,
    });

    if (previousFileId) {
      const owned = await settingsRepository.findOwnedManagedFile(
        actor.userId,
        previousFileId,
      );
      if (owned) {
        await settingsRepository.softDeleteManagedFile(
          previousFileId,
          actor.userId,
        );
      }
    }

    await logSettingsAuditEvent({
      userId: actor.userId,
      action: SETTINGS_AUDIT_ACTIONS.PROFILE_AVATAR_REMOVED,
      context,
    });

    const refreshed =
      (await settingsRepository.findUserProfile(actor.userId)) ?? updated;

    return {
      message: SETTINGS_MESSAGES.AVATAR_REMOVED,
      profile: toSettingsProfileDto(refreshed),
    };
  }

  async listProfileDocuments(
    actor: SettingsActor,
  ): Promise<{ items: ProfileDocumentDto[] }> {
    const files = await settingsRepository.listProfileManagedFiles(
      actor.userId,
      PROFILE_DOCUMENT_TAG,
    );

    return {
      items: files.map((file) => this.toProfileDocumentDto(file)),
    };
  }

  async uploadProfileDocument(
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      tempPath?: string;
      buffer?: Buffer;
    },
    meta: CreateProfileDocumentMetaInput,
    actor: SettingsActor,
    context: SettingsRequestContext,
  ) {
    const type = (meta.type ?? "OTHER") as ProfileDocumentType;
    const managed = await this.uploadPersonalManagedFile(file, actor, {
      tags: [PROFILE_DOCUMENT_TAG, `doc-type:${type}`],
      folderKey: `profile/${actor.userId}/documents`,
      imageOnly: false,
    });

    const fileUrl = buildInternalManagedFileDownloadPath(managed.id);
    const title =
      meta.title?.trim() ||
      managed.originalName ||
      managed.name ||
      "Personal document";

    const employee = await prisma.employeeProfile.findFirst({
      where: { userId: actor.userId, deletedAt: null },
      select: { id: true },
    });

    if (employee) {
      await settingsRepository.createEmployeeDocumentForSelf({
        employeeId: employee.id,
        type,
        title,
        fileUrl,
        fileName: managed.originalName,
        mimeType: managed.mimeType,
        fileSize: Number(managed.sizeBytes),
        notes: meta.notes ?? null,
        uploadedById: actor.userId,
      });
    }

    await logSettingsAuditEvent({
      userId: actor.userId,
      action: SETTINGS_AUDIT_ACTIONS.PROFILE_DOCUMENT_UPLOADED,
      resourceId: managed.id,
      context,
      metadata: { type, title },
    });

    return {
      message: SETTINGS_MESSAGES.DOCUMENT_UPLOADED,
      document: this.toProfileDocumentDto(managed, type, title, meta.notes),
    };
  }

  async deleteProfileDocument(
    documentId: string,
    actor: SettingsActor,
    context: SettingsRequestContext,
  ) {
    const owned = await settingsRepository.findOwnedManagedFile(
      actor.userId,
      documentId,
    );
    if (!owned || !owned.tags.includes(PROFILE_DOCUMENT_TAG)) {
      throw new SettingsError(
        SETTINGS_MESSAGES.NOT_FOUND,
        404,
        SETTINGS_ERROR_CODES.NOT_FOUND,
      );
    }

    const fileUrl = buildInternalManagedFileDownloadPath(owned.id);
    await settingsRepository.softDeleteManagedFile(owned.id, actor.userId);
    await settingsRepository.softDeleteEmployeeDocumentByFileUrl(
      fileUrl,
      actor.userId,
    );

    await logSettingsAuditEvent({
      userId: actor.userId,
      action: SETTINGS_AUDIT_ACTIONS.PROFILE_DOCUMENT_DELETED,
      resourceId: owned.id,
      context,
    });

    return {
      message: SETTINGS_MESSAGES.DOCUMENT_DELETED,
      id: owned.id,
    };
  }

  async downloadOwnedProfileFile(fileId: string, actor: SettingsActor) {
    const owned = await settingsRepository.findOwnedManagedFile(
      actor.userId,
      fileId,
    );
    if (!owned) {
      throw new SettingsError(
        SETTINGS_MESSAGES.NOT_FOUND,
        404,
        SETTINGS_ERROR_CODES.NOT_FOUND,
      );
    }

    const isProfileAsset =
      owned.tags.includes(PROFILE_AVATAR_TAG) ||
      owned.tags.includes(PROFILE_DOCUMENT_TAG);
    if (!isProfileAsset) {
      throw new SettingsError(
        SETTINGS_MESSAGES.FORBIDDEN,
        403,
        SETTINGS_ERROR_CODES.FORBIDDEN,
      );
    }

    const payload = await storageProvider.download(owned.storageKey);
    return {
      file: owned,
      stream: payload.stream,
      sizeBytes: payload.sizeBytes,
    };
  }

  private toProfileDocumentDto(
    file: {
      id: string;
      name: string;
      originalName: string;
      mimeType: string;
      sizeBytes: bigint;
      tags: string[];
      createdAt: Date;
      updatedAt: Date;
    },
    typeOverride?: ProfileDocumentType,
    titleOverride?: string,
    notes?: string | null,
  ): ProfileDocumentDto {
    const typeTag = file.tags.find((tag) => tag.startsWith("doc-type:"));
    const type = (typeOverride ??
      (typeTag?.slice("doc-type:".length) as ProfileDocumentType | undefined) ??
      "OTHER") as ProfileDocumentType;

    return {
      id: file.id,
      type,
      title: titleOverride ?? file.name,
      fileName: file.originalName,
      mimeType: file.mimeType,
      fileSize: Number(file.sizeBytes),
      fileUrl: buildInternalManagedFileDownloadPath(file.id),
      managedFileId: file.id,
      notes: notes ?? null,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
    };
  }

  private async uploadPersonalManagedFile(
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      tempPath?: string;
      buffer?: Buffer;
    },
    actor: SettingsActor,
    options: {
      tags: string[];
      folderKey: string;
      imageOnly: boolean;
    },
  ) {
    let buffer: Buffer | undefined;
    try {
      if (file.buffer && file.buffer.length > 0) {
        buffer = file.buffer;
      } else if (file.tempPath) {
        buffer = await readFile(file.tempPath);
      } else {
        throw new SettingsError(
          "Upload content is missing",
          400,
          SETTINGS_ERROR_CODES.VALIDATION,
        );
      }

      const validated = await validateUploadFile({
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size || buffer.byteLength,
        buffer,
      });

      if (options.imageOnly && validated.category !== "IMAGE") {
        throw new SettingsError(
          "Profile picture must be an image (JPEG, PNG, WebP, or GIF).",
          400,
          SETTINGS_ERROR_CODES.VALIDATION,
        );
      }

      if (validated.extension === "svg" || validated.mimeType === "image/svg+xml") {
        throw new SettingsError(
          "SVG files are not allowed for profile uploads.",
          400,
          SETTINGS_ERROR_CODES.VALIDATION,
        );
      }

      const scan = await runVirusScanHook({
        buffer,
        mimeType: validated.mimeType,
        originalName: file.originalname,
      });
      if (!scan.clean) {
        throw new SettingsError(
          scan.threatName
            ? `File failed virus scan (${scan.threatName})`
            : "File failed virus scan",
          400,
          SETTINGS_ERROR_CODES.VALIDATION,
        );
      }

      let companyId: string | null = null;
      if (actor.role === UserRole.CLIENT || actor.role === "CLIENT") {
        const user = await prisma.user.findUnique({
          where: { id: actor.userId },
          select: { companyId: true },
        });
        companyId = user?.companyId ?? null;
      }

      const uploaded = await storageProvider.upload({
        buffer,
        originalName: file.originalname,
        mimeType: validated.mimeType,
        folderKey: options.folderKey,
      });

      return filesRepository.createFile({
        folderId: null,
        name: validated.displayName,
        originalName: file.originalname.normalize("NFC"),
        mimeType: validated.mimeType,
        extension: validated.extension,
        sizeBytes: BigInt(uploaded.sizeBytes),
        category: validated.category,
        storageKey: uploaded.key,
        storageProvider: uploaded.provider,
        checksum: uploaded.checksum,
        tags: options.tags,
        projectId: null,
        clientId: companyId,
        createdById: actor.userId,
      });
    } finally {
      buffer = undefined;
      if (file.tempPath) {
        try {
          await unlink(file.tempPath);
        } catch {
          // temp cleanup is best-effort
        }
      }
    }
  }

  async requestAccountDeletion(
    input: RequestAccountDeletionInput,
    actor: SettingsActor,
    context: SettingsRequestContext,
  ) {
    if (input.confirmEmail.toLowerCase() !== actor.email.toLowerCase()) {
      throw new SettingsError(
        SETTINGS_MESSAGES.EMAIL_MISMATCH,
        400,
        SETTINGS_ERROR_CODES.VALIDATION,
      );
    }

    const request = await settingsRepository.createDeletionRequest({
      userId: actor.userId,
      reason: input.reason,
    });

    await logSettingsAuditEvent({
      userId: actor.userId,
      action: SETTINGS_AUDIT_ACTIONS.ACCOUNT_DELETION_REQUESTED,
      resourceId: request.id,
      context,
    });

    return {
      message: SETTINGS_MESSAGES.DELETION_REQUESTED,
      requestId: request.id,
      status: request.status,
    };
  }

  async updateCompany(
    input: UpdateCompanySettingsInput,
    actor: SettingsActor,
    context: SettingsRequestContext,
  ) {
    requireOrgAccess(actor);
    const updated = await settingsRepository.updateOrganization({
      companyName: input.companyName,
      logoUrl: input.logoUrl,
      brandColor: input.brandColor,
      website: input.website,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      country: input.country,
      taxNumber:
        encryptionService.encryptIfNeeded(input.taxNumber ?? null) ?? null,
      registrationNumber:
        encryptionService.encryptIfNeeded(input.registrationNumber ?? null) ??
        null,
      currency: input.currency,
      timezone: input.timezone,
      emailFromName: input.emailFromName,
      emailFromAddress: input.emailFromAddress,
      emailReplyTo: input.emailReplyTo,
      storageProvider: input.storageProvider,
    });

    await logSettingsAuditEvent({
      userId: actor.userId,
      action: SETTINGS_AUDIT_ACTIONS.COMPANY_UPDATED,
      resourceId: updated.id,
      context,
    });

    return {
      message: SETTINGS_MESSAGES.COMPANY_UPDATED,
      company: toCompanyDto(updated),
    };
  }

  async updateAppearance(
    input: UpdateAppearanceSettingsInput,
    actor: SettingsActor,
    context: SettingsRequestContext,
  ) {
    const prefs = await settingsRepository.updatePreferences(actor.userId, {
      themeMode: input.themeMode,
      sidebarStyle: input.sidebarStyle,
      compactMode: input.compactMode,
      fontSize: input.fontSize,
      borderRadius: input.borderRadius,
      accentColor: input.accentColor ?? null,
      dashboardDensity: input.dashboardDensity,
    });

    await logSettingsAuditEvent({
      userId: actor.userId,
      action: SETTINGS_AUDIT_ACTIONS.APPEARANCE_UPDATED,
      context,
    });

    return {
      message: SETTINGS_MESSAGES.SAVED,
      appearance: toAppearanceDto(prefs),
    };
  }

  async updateLocale(
    input: UpdateLocaleSettingsInput,
    actor: SettingsActor,
    context: SettingsRequestContext,
  ) {
    const prefs = await settingsRepository.updatePreferences(actor.userId, {
      language: input.language,
      timezone: input.timezone,
      currency: input.currency,
      dateFormat: input.dateFormat,
      timeFormat: input.timeFormat,
    });

    await logSettingsAuditEvent({
      userId: actor.userId,
      action: SETTINGS_AUDIT_ACTIONS.LOCALE_UPDATED,
      context,
    });

    return {
      message: SETTINGS_MESSAGES.SAVED,
      locale: toLocaleDto(prefs),
    };
  }

  async updateNotifications(
    input: UpdateNotificationSettingsInput,
    actor: SettingsActor,
    context: SettingsRequestContext,
  ) {
    const prefs = await settingsRepository.updatePreferences(actor.userId, {
      emailNotifications: input.emailNotifications,
      pushNotifications: input.pushNotifications,
      desktopNotifications: input.desktopNotifications,
      smsNotifications: input.smsNotifications,
      whatsappNotifications: input.whatsappNotifications,
    });

    await logSettingsAuditEvent({
      userId: actor.userId,
      action: SETTINGS_AUDIT_ACTIONS.NOTIFICATIONS_UPDATED,
      context,
    });

    return {
      message: SETTINGS_MESSAGES.SAVED,
      notifications: toNotificationDto(prefs),
    };
  }

  async updateAi(
    input: UpdateAiSettingsInput,
    actor: SettingsActor,
    context: SettingsRequestContext,
  ) {
    const preferredProvider = input.aiProvider?.trim() || "gemini";
    const prefs = await settingsRepository.updatePreferences(actor.userId, {
      aiProvider: preferredProvider,
      aiModel: input.aiModel ?? null,
      aiTemperature: input.aiTemperature ?? null,
      aiMaxTokens: input.aiMaxTokens ?? null,
      aiHistoryEnabled: input.aiHistoryEnabled,
      aiPrivacyMode: input.aiPrivacyMode,
    });

    setAiPreferredProvider(preferredProvider);
    const provider = preferredProvider.toLowerCase();
    if (provider === "gemini" || provider === "openai" || provider === "claude") {
      setAiProviderModel(provider, input.aiModel);
    }

    await logSettingsAuditEvent({
      userId: actor.userId,
      action: SETTINGS_AUDIT_ACTIONS.AI_UPDATED,
      context,
    });

    return {
      message: SETTINGS_MESSAGES.SAVED,
      ai: toAiDto(prefs),
    };
  }

  async updateSecurityPreferences(
    input: UpdateSecurityPreferencesInput,
    actor: SettingsActor,
    context: SettingsRequestContext,
  ) {
    const prefs = await settingsRepository.updatePreferences(actor.userId, {
      twoFactorPreferred: input.twoFactorPreferred,
      sessionTimeoutMinutes: input.sessionTimeoutMinutes,
      loginAlertsEnabled: input.loginAlertsEnabled,
      deviceTrustEnabled: input.deviceTrustEnabled,
      passwordPolicyStrict: input.passwordPolicyStrict,
    });

    const user = await settingsRepository.findUserProfile(actor.userId);

    await logSettingsAuditEvent({
      userId: actor.userId,
      action: SETTINGS_AUDIT_ACTIONS.SECURITY_PREFS_UPDATED,
      context,
    });

    return {
      message: SETTINGS_MESSAGES.SAVED,
      security: toSecurityPrefsDto(prefs, user?.twoFactorEnabled ?? false),
    };
  }

  async resetPreferences(
    actor: SettingsActor,
    context: SettingsRequestContext,
  ) {
    const prefs = await settingsRepository.resetPreferences(actor.userId);
    await logSettingsAuditEvent({
      userId: actor.userId,
      action: SETTINGS_AUDIT_ACTIONS.PREFERENCES_RESET,
      context,
    });
    return {
      message: SETTINGS_MESSAGES.RESET,
      appearance: toAppearanceDto(prefs),
      locale: toLocaleDto(prefs),
      notifications: toNotificationDto(prefs),
      ai: toAiDto(prefs),
    };
  }

  async listApiKeys(actor: SettingsActor) {
    requireOrgAccess(actor);
    const items = await settingsRepository.listCredentials();
    return { items: items.map(toCredentialDto) };
  }

  async createApiKey(
    input: CreateIntegrationCredentialInput,
    actor: SettingsActor,
    context: SettingsRequestContext,
  ) {
    requireOrgAccess(actor);
    const encrypted = encryptSecret(input.secret);
    const created = await settingsRepository.createCredential({
      provider: input.provider,
      label: input.label,
      ...encrypted,
      createdById: actor.userId,
    });

    await logSettingsAuditEvent({
      userId: actor.userId,
      action: SETTINGS_AUDIT_ACTIONS.API_KEY_CREATED,
      resourceId: created.id,
      metadata: { provider: input.provider, label: input.label },
      context,
    });

    return {
      message: SETTINGS_MESSAGES.KEY_CREATED,
      credential: toCredentialDto(created),
    };
  }

  async updateApiKey(
    id: string,
    input: UpdateIntegrationCredentialInput,
    actor: SettingsActor,
    context: SettingsRequestContext,
  ) {
    requireOrgAccess(actor);
    const existing = await settingsRepository.findCredential(id);
    if (!existing) {
      throw new SettingsError(
        SETTINGS_MESSAGES.NOT_FOUND,
        404,
        SETTINGS_ERROR_CODES.NOT_FOUND,
      );
    }

    const encrypted = input.secret ? encryptSecret(input.secret) : null;
    const updated = await settingsRepository.updateCredential(id, {
      label: input.label,
      isActive: input.isActive,
      updatedById: actor.userId,
      ...(encrypted
        ? {
            encryptedSecret: encrypted.encryptedSecret,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            secretLast4: encrypted.secretLast4,
            lastRotatedAt: new Date(),
          }
        : {}),
    });

    await logSettingsAuditEvent({
      userId: actor.userId,
      action: SETTINGS_AUDIT_ACTIONS.API_KEY_UPDATED,
      resourceId: id,
      context,
    });

    return {
      message: SETTINGS_MESSAGES.KEY_UPDATED,
      credential: toCredentialDto(updated),
    };
  }

  async deleteApiKey(
    id: string,
    actor: SettingsActor,
    context: SettingsRequestContext,
  ) {
    requireOrgAccess(actor);
    const existing = await settingsRepository.findCredential(id);
    if (!existing) {
      throw new SettingsError(
        SETTINGS_MESSAGES.NOT_FOUND,
        404,
        SETTINGS_ERROR_CODES.NOT_FOUND,
      );
    }

    await settingsRepository.softDeleteCredential(id, actor.userId);
    await logSettingsAuditEvent({
      userId: actor.userId,
      action: SETTINGS_AUDIT_ACTIONS.API_KEY_DELETED,
      resourceId: id,
      context,
    });

    return { message: SETTINGS_MESSAGES.KEY_DELETED };
  }

  async listBackups(actor: SettingsActor) {
    requireOrgAccess(actor);
    const items = await settingsRepository.listBackups();
    return { items: items.map(toBackupDto) };
  }

  async createBackup(
    input: CreateBackupInput,
    actor: SettingsActor,
    context: SettingsRequestContext,
  ) {
    requireOrgAccess(actor);
    const backup = await settingsRepository.createBackup({
      type: input.type ?? "MANUAL",
      triggeredBy: actor.userId,
    });

    // Prepare-only architecture: mark complete with a metadata snapshot checksum.
    const snapshot = JSON.stringify({
      at: new Date().toISOString(),
      by: actor.userId,
      type: backup.type,
    });
    const checksum = createHash("sha256").update(snapshot).digest("hex");
    const completed = await settingsRepository.completeBackup(backup.id, {
      status: "COMPLETED",
      storageKey: `backups/${backup.id}.meta.json`,
      sizeBytes: BigInt(Buffer.byteLength(snapshot)),
      checksum,
      message:
        "Metadata-only snapshot recorded (not a full database dump; Railway/Postgres owns infrastructure backups)",
    });

    await logSettingsAuditEvent({
      userId: actor.userId,
      action: SETTINGS_AUDIT_ACTIONS.BACKUP_CREATED,
      resourceId: backup.id,
      context,
    });

    return {
      message: SETTINGS_MESSAGES.BACKUP_STARTED,
      backup: toBackupDto(completed),
    };
  }

  async getBilling(actor: SettingsActor) {
    requireOrgAccess(actor);
    const [billing, seatsUsed, storage] = await Promise.all([
      settingsRepository.getOrCreateBilling(),
      settingsRepository.countUsers(),
      settingsRepository.storageStats(),
    ]);
    return toBillingDto(billing, seatsUsed, storage.usedBytes);
  }

  async updateBilling(
    input: UpdateBillingSettingsInput,
    actor: SettingsActor,
    context: SettingsRequestContext,
  ) {
    requireOrgAccess(actor);
    const updated = await settingsRepository.updateBilling({
      billingEmail: input.billingEmail,
    });
    const [seatsUsed, storage] = await Promise.all([
      settingsRepository.countUsers(),
      settingsRepository.storageStats(),
    ]);

    await logSettingsAuditEvent({
      userId: actor.userId,
      action: SETTINGS_AUDIT_ACTIONS.BILLING_UPDATED,
      context,
    });

    return {
      message: SETTINGS_MESSAGES.SAVED,
      billing: toBillingDto(updated, seatsUsed, storage.usedBytes),
    };
  }

  async getStorage(actor: SettingsActor) {
    requireOrgAccess(actor);
    const [company, billing, storage] = await Promise.all([
      settingsRepository.getOrCreateOrganization(),
      settingsRepository.getOrCreateBilling(),
      settingsRepository.storageStats(),
    ]);
    return toStorageDto({
      provider:
        company.storageProvider ?? process.env.STORAGE_PROVIDER ?? "local",
      quotaBytes:
        company.storageQuotaBytes ?? billing.storageQuotaBytes,
      usedBytes: storage.usedBytes,
      fileCount: storage.fileCount,
    });
  }
}

export const settingsService = new SettingsService();
