import type {
  SettingsProfileDto,
  UpdateAiSettingsInput,
  UpdateAppearanceSettingsInput,
  UpdateCompanySettingsInput,
  UpdateLocaleSettingsInput,
  UpdateNotificationSettingsInput,
  UpdateSecurityPreferencesInput,
  UpdateSettingsProfileInput,
} from "../schemas/settings.schema.js";

export type {
  SettingsProfileDto,
  UpdateAiSettingsInput,
  UpdateAppearanceSettingsInput,
  UpdateCompanySettingsInput,
  UpdateLocaleSettingsInput,
  UpdateNotificationSettingsInput,
  UpdateSecurityPreferencesInput,
  UpdateSettingsProfileInput,
};

export type AppLanguageCode = "EN" | "UR" | "AR";

export interface CompanySettingsDto {
  id: string;
  key: string;
  companyName: string;
  logoUrl: string | null;
  brandColor: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  taxNumber: string | null;
  registrationNumber: string | null;
  currency: string;
  timezone: string;
  emailFromName: string | null;
  emailFromAddress: string | null;
  emailReplyTo: string | null;
  storageProvider: string | null;
  storageQuotaBytes: string | null;
  updatedAt: string;
}

export interface AppearanceSettingsDto {
  themeMode: "LIGHT" | "DARK" | "SYSTEM";
  sidebarStyle: "DEFAULT" | "COMPACT" | "EXPANDED";
  compactMode: boolean;
  fontSize: "SMALL" | "MEDIUM" | "LARGE";
  borderRadius: "NONE" | "DEFAULT" | "ROUNDED";
  accentColor: string | null;
  dashboardDensity: "COMPACT" | "COMFORTABLE" | "SPACIOUS";
}

export interface LocaleSettingsDto {
  language: AppLanguageCode;
  timezone: string;
  currency: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
}

export interface NotificationSettingsDto {
  emailNotifications: boolean;
  pushNotifications: boolean;
  desktopNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
}

export interface AiSettingsDto {
  aiProvider: string | null;
  aiModel: string | null;
  aiTemperature: number | null;
  aiMaxTokens: number | null;
  aiHistoryEnabled: boolean;
  aiPrivacyMode: boolean;
}

export interface SecurityPreferencesDto {
  twoFactorPreferred: boolean;
  twoFactorEnabled: boolean;
  sessionTimeoutMinutes: number;
  loginAlertsEnabled: boolean;
  deviceTrustEnabled: boolean;
  passwordPolicyStrict: boolean;
}

export interface IntegrationCredentialDto {
  id: string;
  provider: string;
  label: string;
  secretLast4: string;
  isActive: boolean;
  lastRotatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Always null — secrets are never exposed. */
  secret: null;
}

export interface BackupRecordDto {
  id: string;
  type: "MANUAL" | "AUTO";
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  storageKey: string | null;
  sizeBytes: string | null;
  checksum: string | null;
  message: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface BillingSettingsDto {
  planCode: string;
  planName: string;
  status: string;
  seatsIncluded: number;
  seatsUsed: number;
  storageQuotaBytes: string;
  storageUsedBytes: string;
  aiCreditsIncluded: number;
  aiCreditsUsed: number;
  billingEmail: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  paymentMethods: Array<{
    id: string;
    brand: string;
    last4: string;
    isDefault: boolean;
  }>;
  history: Array<{
    id: string;
    description: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
}

export interface StorageSettingsDto {
  provider: string;
  quotaBytes: string;
  usedBytes: string;
  fileCount: number;
}

export interface SettingsOverviewDto {
  profile: SettingsProfileDto;
  appearance: AppearanceSettingsDto;
  locale: LocaleSettingsDto;
  notifications: NotificationSettingsDto;
  ai: AiSettingsDto;
  security: SecurityPreferencesDto;
  company: CompanySettingsDto | null;
  billing: BillingSettingsDto | null;
  storage: StorageSettingsDto | null;
  canManageOrganization: boolean;
}
