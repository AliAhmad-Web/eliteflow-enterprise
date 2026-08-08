import { z } from "zod";

import {
  avatarUrlSchema,
  emailSchema,
  firstNameSchema,
  lastNameSchema,
  uuidSchema,
} from "./common.schema.js";

// =============================================================================
// Phase 18 — Settings Schemas
// =============================================================================

export const THEME_MODES = ["LIGHT", "DARK", "SYSTEM"] as const;
export const SIDEBAR_STYLES = ["DEFAULT", "COMPACT", "EXPANDED"] as const;
export const FONT_SIZES = ["SMALL", "MEDIUM", "LARGE"] as const;
export const BORDER_RADII = ["NONE", "DEFAULT", "ROUNDED"] as const;
export const DASHBOARD_DENSITIES = ["COMPACT", "COMFORTABLE", "SPACIOUS"] as const;
export const APP_LANGUAGES = ["EN", "UR", "AR"] as const;
export const INTEGRATION_PROVIDERS = [
  "OPENAI",
  "RESEND",
  "STRIPE",
  "SUPABASE",
  "CLOUDINARY",
  "GOOGLE",
  "GITHUB",
  "GEMINI",
  "OTHER",
] as const;

export const themeModeSchema = z.enum(THEME_MODES);
export const sidebarStyleSchema = z.enum(SIDEBAR_STYLES);
export const fontSizeSchema = z.enum(FONT_SIZES);
export const borderRadiusSchema = z.enum(BORDER_RADII);
export const dashboardDensitySchema = z.enum(DASHBOARD_DENSITIES);
export const appLanguageSchema = z.enum(APP_LANGUAGES);
export const integrationProviderSchema = z.enum(INTEGRATION_PROVIDERS);

const optionalNullableString = (max: number) =>
  z.string().trim().max(max).nullable().optional();

export const updateSettingsProfileSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50)
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "Username may only contain letters, numbers, dots, underscores, and hyphens",
    )
    .nullable()
    .optional(),
  avatarUrl: avatarUrlSchema,
  phone: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
  designation: z.string().trim().max(120).nullable().optional(),
  address: optionalNullableString(500),
  city: optionalNullableString(120),
  country: optionalNullableString(120),
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be YYYY-MM-DD")
    .nullable()
    .optional(),
  personalEmail: z
    .string()
    .trim()
    .email("Invalid personal email")
    .max(320)
    .nullable()
    .optional(),
  workLocation: optionalNullableString(120),
});

export type UpdateSettingsProfileInput = z.infer<
  typeof updateSettingsProfileSchema
>;

export const PROFILE_DOCUMENT_TYPES = [
  "CNIC",
  "PASSPORT",
  "CV",
  "CERTIFICATE",
  "DEGREE",
  "CONTRACT",
  "OTHER",
] as const;

export const profileDocumentTypeSchema = z.enum(PROFILE_DOCUMENT_TYPES);
export type ProfileDocumentType = z.infer<typeof profileDocumentTypeSchema>;

export const profileDocumentIdParamsSchema = z.object({
  id: uuidSchema,
});
export type ProfileDocumentIdParamsInput = z.infer<
  typeof profileDocumentIdParamsSchema
>;

export const createProfileDocumentMetaSchema = z.object({
  type: profileDocumentTypeSchema.default("OTHER"),
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});
export type CreateProfileDocumentMetaInput = z.infer<
  typeof createProfileDocumentMetaSchema
>;

export const profileDocumentDtoSchema = z.object({
  id: z.string().uuid(),
  type: profileDocumentTypeSchema,
  title: z.string(),
  fileName: z.string().nullable(),
  mimeType: z.string().nullable(),
  fileSize: z.number().nullable(),
  fileUrl: z.string(),
  managedFileId: z.string().uuid(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProfileDocumentDto = z.infer<typeof profileDocumentDtoSchema>;

export const requestAccountDeletionSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  confirmEmail: emailSchema,
});

export type RequestAccountDeletionInput = z.infer<
  typeof requestAccountDeletionSchema
>;

export const updateCompanySettingsSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  logoUrl: z.string().url().max(2048).nullable().optional(),
  brandColor: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Invalid hex color")
    .nullable()
    .optional(),
  website: z.string().url().max(500).nullable().optional(),
  addressLine1: z.string().trim().max(255).nullable().optional(),
  addressLine2: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(100).nullable().optional(),
  postalCode: z.string().trim().max(30).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  taxNumber: z.string().trim().max(100).nullable().optional(),
  registrationNumber: z.string().trim().max(100).nullable().optional(),
  currency: z.string().trim().min(3).max(10),
  timezone: z.string().trim().min(1).max(100),
  emailFromName: z.string().trim().max(200).nullable().optional(),
  emailFromAddress: z.string().email().max(320).nullable().optional(),
  emailReplyTo: z.string().email().max(320).nullable().optional(),
  storageProvider: z.string().trim().max(50).nullable().optional(),
});

export type UpdateCompanySettingsInput = z.infer<
  typeof updateCompanySettingsSchema
>;

export const updateAppearanceSettingsSchema = z.object({
  themeMode: themeModeSchema,
  sidebarStyle: sidebarStyleSchema,
  compactMode: z.boolean(),
  fontSize: fontSizeSchema,
  borderRadius: borderRadiusSchema,
  accentColor: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .nullable()
    .optional(),
  dashboardDensity: dashboardDensitySchema,
});

export type UpdateAppearanceSettingsInput = z.infer<
  typeof updateAppearanceSettingsSchema
>;

export const updateLocaleSettingsSchema = z.object({
  language: appLanguageSchema,
  timezone: z.string().trim().min(1).max(100),
  currency: z.string().trim().min(3).max(10),
  dateFormat: z.string().trim().min(1).max(30),
  timeFormat: z.enum(["12h", "24h"]),
});

export type UpdateLocaleSettingsInput = z.infer<
  typeof updateLocaleSettingsSchema
>;

export const updateNotificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  desktopNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  whatsappNotifications: z.boolean(),
});

export type UpdateNotificationSettingsInput = z.infer<
  typeof updateNotificationSettingsSchema
>;

export const updateAiSettingsSchema = z.object({
  aiProvider: z.string().trim().max(50).nullable().optional(),
  aiModel: z.string().trim().max(100).nullable().optional(),
  aiTemperature: z.number().min(0).max(2).nullable().optional(),
  aiMaxTokens: z.number().int().min(64).max(128000).nullable().optional(),
  aiHistoryEnabled: z.boolean(),
  aiPrivacyMode: z.boolean(),
});

export type UpdateAiSettingsInput = z.infer<typeof updateAiSettingsSchema>;

export const updateSecurityPreferencesSchema = z.object({
  twoFactorPreferred: z.boolean(),
  sessionTimeoutMinutes: z.number().int().min(15).max(10080),
  loginAlertsEnabled: z.boolean(),
  deviceTrustEnabled: z.boolean(),
  passwordPolicyStrict: z.boolean(),
});

export type UpdateSecurityPreferencesInput = z.infer<
  typeof updateSecurityPreferencesSchema
>;

export const createIntegrationCredentialSchema = z.object({
  provider: integrationProviderSchema,
  label: z.string().trim().min(1).max(120),
  secret: z.string().trim().min(8).max(4096),
});

export type CreateIntegrationCredentialInput = z.infer<
  typeof createIntegrationCredentialSchema
>;

export const updateIntegrationCredentialSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  secret: z.string().trim().min(8).max(4096).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateIntegrationCredentialInput = z.infer<
  typeof updateIntegrationCredentialSchema
>;

export const integrationCredentialIdParamsSchema = z.object({
  id: uuidSchema,
});

export type IntegrationCredentialIdParamsInput = z.infer<
  typeof integrationCredentialIdParamsSchema
>;

export const createBackupSchema = z.object({
  type: z.enum(["MANUAL", "AUTO"]).optional(),
});

export type CreateBackupInput = z.infer<typeof createBackupSchema>;

export const backupIdParamsSchema = z.object({
  id: uuidSchema,
});

export type BackupIdParamsInput = z.infer<typeof backupIdParamsSchema>;

export const updateBillingSettingsSchema = z.object({
  billingEmail: z.string().email().max(320).nullable().optional(),
});

export type UpdateBillingSettingsInput = z.infer<
  typeof updateBillingSettingsSchema
>;

export const settingsProfileDtoSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  avatarUrl: z.string().nullable(),
  phone: z.string().nullable(),
  bio: z.string().nullable(),
  designation: z.string().nullable(),
  department: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  personalEmail: z.string().nullable().optional(),
  workLocation: z.string().nullable().optional(),
  employeeProfileId: z.string().uuid().nullable().optional(),
  role: z
    .object({
      id: z.string().uuid(),
      code: z.string(),
      name: z.string(),
    })
    .optional(),
  twoFactorEnabled: z.boolean(),
  lastLoginAt: z.string().nullable(),
  emailVerified: z.boolean(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SettingsProfileDto = z.infer<typeof settingsProfileDtoSchema>;
