import type {
  AiSettingsDto,
  AppearanceSettingsDto,
  BackupRecordDto,
  BillingSettingsDto,
  CompanySettingsDto,
  IntegrationCredentialDto,
  LocaleSettingsDto,
  NotificationSettingsDto,
  SecurityPreferencesDto,
  SettingsProfileDto,
  StorageSettingsDto,
} from "@enterprise/shared";

import { encryptionService } from "../../shared/security/encryption.service.js";

export function toSettingsProfileDto(user: {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  phone: string | null;
  bio: string | null;
  designation: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  dateOfBirth?: Date | null;
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  emailVerified: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  role?: {
    id: string;
    code: string;
    name: string;
  } | null;
  employeeProfile?: {
    id?: string;
    designation?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    dateOfBirth?: Date | null;
    personalEmail?: string | null;
    workLocation?: string | null;
    department?: { name: string } | null;
  } | null;
}): SettingsProfileDto {
  const employee = user.employeeProfile;
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    bio: user.bio,
    designation: user.designation ?? employee?.designation ?? null,
    department: employee?.department?.name ?? null,
    address: user.address ?? employee?.address ?? null,
    city: user.city ?? employee?.city ?? null,
    country: user.country ?? employee?.country ?? null,
    dateOfBirth:
      (user.dateOfBirth ?? employee?.dateOfBirth)?.toISOString().slice(0, 10) ??
      null,
    personalEmail: employee?.personalEmail ?? null,
    workLocation: employee?.workLocation ?? null,
    employeeProfileId: employee?.id ?? null,
    role: user.role
      ? {
          id: user.role.id,
          code: user.role.code,
          name: user.role.name,
        }
      : undefined,
    twoFactorEnabled: user.twoFactorEnabled,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    emailVerified: user.emailVerified,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toAppearanceDto(prefs: {
  themeMode: AppearanceSettingsDto["themeMode"];
  sidebarStyle: AppearanceSettingsDto["sidebarStyle"];
  compactMode: boolean;
  fontSize: AppearanceSettingsDto["fontSize"];
  borderRadius: AppearanceSettingsDto["borderRadius"];
  accentColor: string | null;
  dashboardDensity: AppearanceSettingsDto["dashboardDensity"];
}): AppearanceSettingsDto {
  return {
    themeMode: prefs.themeMode,
    sidebarStyle: prefs.sidebarStyle,
    compactMode: prefs.compactMode,
    fontSize: prefs.fontSize,
    borderRadius: prefs.borderRadius,
    accentColor: prefs.accentColor,
    dashboardDensity: prefs.dashboardDensity,
  };
}

export function toLocaleDto(prefs: {
  language: LocaleSettingsDto["language"];
  timezone: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
}): LocaleSettingsDto {
  return {
    language: prefs.language,
    timezone: prefs.timezone,
    currency: prefs.currency,
    dateFormat: prefs.dateFormat,
    timeFormat: prefs.timeFormat === "12h" ? "12h" : "24h",
  };
}

export function toNotificationDto(prefs: {
  emailNotifications: boolean;
  pushNotifications: boolean;
  desktopNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
}): NotificationSettingsDto {
  return {
    emailNotifications: prefs.emailNotifications,
    pushNotifications: prefs.pushNotifications,
    desktopNotifications: prefs.desktopNotifications,
    smsNotifications: prefs.smsNotifications,
    whatsappNotifications: prefs.whatsappNotifications,
  };
}

export function toAiDto(prefs: {
  aiProvider: string | null;
  aiModel: string | null;
  aiTemperature: number | null;
  aiMaxTokens: number | null;
  aiHistoryEnabled: boolean;
  aiPrivacyMode: boolean;
}): AiSettingsDto {
  return {
    aiProvider: prefs.aiProvider,
    aiModel: prefs.aiModel,
    aiTemperature: prefs.aiTemperature,
    aiMaxTokens: prefs.aiMaxTokens,
    aiHistoryEnabled: prefs.aiHistoryEnabled,
    aiPrivacyMode: prefs.aiPrivacyMode,
  };
}

export function toSecurityPrefsDto(
  prefs: {
    twoFactorPreferred: boolean;
    sessionTimeoutMinutes: number;
    loginAlertsEnabled: boolean;
    deviceTrustEnabled: boolean;
    passwordPolicyStrict: boolean;
  },
  twoFactorEnabled: boolean,
): SecurityPreferencesDto {
  return {
    twoFactorPreferred: prefs.twoFactorPreferred,
    twoFactorEnabled,
    sessionTimeoutMinutes: prefs.sessionTimeoutMinutes,
    loginAlertsEnabled: prefs.loginAlertsEnabled,
    deviceTrustEnabled: prefs.deviceTrustEnabled,
    passwordPolicyStrict: prefs.passwordPolicyStrict,
  };
}

export function toCompanyDto(row: {
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
  storageQuotaBytes: bigint | null;
  updatedAt: Date;
}): CompanySettingsDto {
  return {
    id: row.id,
    key: row.key,
    companyName: row.companyName,
    logoUrl: row.logoUrl,
    brandColor: row.brandColor,
    website: row.website,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    country: row.country,
    taxNumber:
      encryptionService.decryptIfNeeded(row.taxNumber) ?? null,
    registrationNumber:
      encryptionService.decryptIfNeeded(row.registrationNumber) ?? null,
    currency: row.currency,
    timezone: row.timezone,
    emailFromName: row.emailFromName,
    emailFromAddress: row.emailFromAddress,
    emailReplyTo: row.emailReplyTo,
    storageProvider: row.storageProvider,
    storageQuotaBytes: row.storageQuotaBytes?.toString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toCredentialDto(row: {
  id: string;
  provider: string;
  label: string;
  secretLast4: string;
  isActive: boolean;
  lastRotatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): IntegrationCredentialDto {
  return {
    id: row.id,
    provider: row.provider,
    label: row.label,
    secretLast4: row.secretLast4,
    isActive: row.isActive,
    lastRotatedAt: row.lastRotatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    secret: null,
  };
}

export function toBackupDto(row: {
  id: string;
  type: BackupRecordDto["type"];
  status: BackupRecordDto["status"];
  storageKey: string | null;
  sizeBytes: bigint | null;
  checksum: string | null;
  message: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}): BackupRecordDto {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    storageKey: row.storageKey,
    sizeBytes: row.sizeBytes?.toString() ?? null,
    checksum: row.checksum,
    message: row.message,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toBillingDto(
  row: {
    planCode: string;
    planName: string;
    status: string;
    seatsIncluded: number;
    seatsUsed: number;
    storageQuotaBytes: bigint;
    storageUsedBytes: bigint;
    aiCreditsIncluded: number;
    aiCreditsUsed: number;
    billingEmail: string | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd?: boolean;
    trialEndsAt?: Date | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
  },
  seatsUsedLive: number,
  storageUsedLive: bigint,
  history: Array<{
    id: string;
    description: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }> = [],
): BillingSettingsDto {
  return {
    planCode: row.planCode,
    planName: row.planName,
    status: row.status,
    seatsIncluded: row.seatsIncluded,
    seatsUsed: seatsUsedLive,
    storageQuotaBytes: row.storageQuotaBytes.toString(),
    storageUsedBytes: storageUsedLive.toString(),
    aiCreditsIncluded: row.aiCreditsIncluded,
    aiCreditsUsed: row.aiCreditsUsed,
    billingEmail: row.billingEmail,
    currentPeriodStart: row.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    // Never invent payment methods — Stripe Customer Portal manages cards.
    paymentMethods: [],
    history,
  };
}

export function toStorageDto(input: {
  provider: string;
  quotaBytes: bigint;
  usedBytes: bigint;
  fileCount: number;
}): StorageSettingsDto {
  return {
    provider: input.provider,
    quotaBytes: input.quotaBytes.toString(),
    usedBytes: input.usedBytes.toString(),
    fileCount: input.fileCount,
  };
}
