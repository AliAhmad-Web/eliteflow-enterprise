import {
  SETTINGS_API_PREFIX,
  type CreateBackupInput,
  type CreateIntegrationCredentialInput,
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
  type BackupRecordDto,
  type BillingSettingsDto,
  type IntegrationCredentialDto,
  type StorageSettingsDto,
} from "@enterprise/shared";

import { apiRequest } from "@/services/api/api-client";

export const settingsService = {
  overview() {
    return apiRequest<SettingsOverviewDto>(`${SETTINGS_API_PREFIX}/overview`, {
      auth: true,
    });
  },

  updateProfile(input: UpdateSettingsProfileInput) {
    return apiRequest<{ message: string; profile: SettingsOverviewDto["profile"] }>(
      `${SETTINGS_API_PREFIX}/profile`,
      { method: "PATCH", body: input, auth: true },
    );
  },

  requestDeletion(input: RequestAccountDeletionInput) {
    return apiRequest<{ message: string; requestId: string }>(
      `${SETTINGS_API_PREFIX}/profile/delete-request`,
      { method: "POST", body: input, auth: true },
    );
  },

  updateCompany(input: UpdateCompanySettingsInput) {
    return apiRequest<{ message: string; company: NonNullable<SettingsOverviewDto["company"]> }>(
      `${SETTINGS_API_PREFIX}/company`,
      { method: "PUT", body: input, auth: true },
    );
  },

  updateAppearance(input: UpdateAppearanceSettingsInput) {
    return apiRequest<{ message: string; appearance: SettingsOverviewDto["appearance"] }>(
      `${SETTINGS_API_PREFIX}/appearance`,
      { method: "PUT", body: input, auth: true },
    );
  },

  updateLocale(input: UpdateLocaleSettingsInput) {
    return apiRequest<{ message: string; locale: SettingsOverviewDto["locale"] }>(
      `${SETTINGS_API_PREFIX}/locale`,
      { method: "PUT", body: input, auth: true },
    );
  },

  updateNotifications(input: UpdateNotificationSettingsInput) {
    return apiRequest<{
      message: string;
      notifications: SettingsOverviewDto["notifications"];
    }>(`${SETTINGS_API_PREFIX}/notifications`, {
      method: "PUT",
      body: input,
      auth: true,
    });
  },

  updateAi(input: UpdateAiSettingsInput) {
    return apiRequest<{ message: string; ai: SettingsOverviewDto["ai"] }>(
      `${SETTINGS_API_PREFIX}/ai`,
      { method: "PUT", body: input, auth: true },
    );
  },

  updateSecurity(input: UpdateSecurityPreferencesInput) {
    return apiRequest<{ message: string; security: SettingsOverviewDto["security"] }>(
      `${SETTINGS_API_PREFIX}/security`,
      { method: "PUT", body: input, auth: true },
    );
  },

  resetPreferences() {
    return apiRequest<{ message: string }>(
      `${SETTINGS_API_PREFIX}/preferences/reset`,
      { method: "POST", auth: true },
    );
  },

  listApiKeys() {
    return apiRequest<{ items: IntegrationCredentialDto[] }>(
      `${SETTINGS_API_PREFIX}/api-keys`,
      { auth: true },
    );
  },

  createApiKey(input: CreateIntegrationCredentialInput) {
    return apiRequest<{ message: string; credential: IntegrationCredentialDto }>(
      `${SETTINGS_API_PREFIX}/api-keys`,
      { method: "POST", body: input, auth: true },
    );
  },

  updateApiKey(id: string, input: UpdateIntegrationCredentialInput) {
    return apiRequest<{ message: string; credential: IntegrationCredentialDto }>(
      `${SETTINGS_API_PREFIX}/api-keys/${id}`,
      { method: "PATCH", body: input, auth: true },
    );
  },

  deleteApiKey(id: string) {
    return apiRequest<{ message: string }>(
      `${SETTINGS_API_PREFIX}/api-keys/${id}`,
      { method: "DELETE", auth: true },
    );
  },

  listBackups() {
    return apiRequest<{ items: BackupRecordDto[] }>(
      `${SETTINGS_API_PREFIX}/backups`,
      { auth: true },
    );
  },

  createBackup(input: CreateBackupInput = {}) {
    return apiRequest<{ message: string; backup: BackupRecordDto }>(
      `${SETTINGS_API_PREFIX}/backups`,
      { method: "POST", body: input, auth: true },
    );
  },

  getBilling() {
    return apiRequest<BillingSettingsDto>(`${SETTINGS_API_PREFIX}/billing`, {
      auth: true,
    });
  },

  updateBilling(input: UpdateBillingSettingsInput) {
    return apiRequest<{ message: string; billing: BillingSettingsDto }>(
      `${SETTINGS_API_PREFIX}/billing`,
      { method: "PATCH", body: input, auth: true },
    );
  },

  getStorage() {
    return apiRequest<StorageSettingsDto>(`${SETTINGS_API_PREFIX}/storage`, {
      auth: true,
    });
  },
};
