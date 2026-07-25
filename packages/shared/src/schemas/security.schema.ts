import { z } from "zod";

import { uuidSchema } from "./common.schema.js";

// =============================================================================
// Phase 17 — Enterprise Security Schemas
// =============================================================================

export const SECURITY_SEVERITIES = [
  "INFO",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export const SECURITY_EVENT_CATEGORIES = [
  "AUTH",
  "ACCOUNT",
  "SESSION",
  "ACCESS",
  "FILE",
  "API",
  "CAPTCHA",
  "RATE_LIMIT",
  "POLICY",
] as const;

export const securitySeveritySchema = z.enum(SECURITY_SEVERITIES);
export const securityEventCategorySchema = z.enum(SECURITY_EVENT_CATEGORIES);

/** Optional captcha token — required when reCAPTCHA is enabled server-side. */
export const captchaTokenSchema = z
  .string()
  .trim()
  .min(1, "Captcha verification is required")
  .max(4096, "Captcha token is invalid")
  .optional();

export const contactFormSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must not exceed 120 characters"),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Please enter a valid email address")
    .max(320)
    .toLowerCase(),
  subject: z
    .string({ required_error: "Subject is required" })
    .trim()
    .min(1, "Subject is required")
    .max(200, "Subject must not exceed 200 characters"),
  message: z
    .string({ required_error: "Message is required" })
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message must not exceed 5000 characters"),
  captchaToken: captchaTokenSchema,
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

export const listSecurityLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().max(200).optional(),
  action: z.string().trim().max(100).optional(),
  resource: z.string().trim().max(100).optional(),
  userId: uuidSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type ListSecurityLogsQueryInput = z.infer<
  typeof listSecurityLogsQuerySchema
>;

export const listLoginHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  email: z.string().trim().max(320).optional(),
  userId: uuidSchema.optional(),
  success: z.enum(["true", "false"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type ListLoginHistoryQueryInput = z.infer<
  typeof listLoginHistoryQuerySchema
>;

export const listSecurityEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  severity: securitySeveritySchema.optional(),
  category: securityEventCategorySchema.optional(),
  unresolvedOnly: z.enum(["true", "false"]).optional(),
  userId: uuidSchema.optional(),
});

export type ListSecurityEventsQueryInput = z.infer<
  typeof listSecurityEventsQuerySchema
>;

export const listActiveSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  userId: uuidSchema.optional(),
  search: z.string().trim().max(200).optional(),
});

export type ListActiveSessionsQueryInput = z.infer<
  typeof listActiveSessionsQuerySchema
>;

export const terminateSessionParamsSchema = z.object({
  sessionId: uuidSchema,
});

export type TerminateSessionParamsInput = z.infer<
  typeof terminateSessionParamsSchema
>;

export const unlockAccountSchema = z.object({
  userId: uuidSchema,
  reason: z
    .string()
    .trim()
    .max(500)
    .optional(),
});

export type UnlockAccountInput = z.infer<typeof unlockAccountSchema>;

export const resolveSecurityEventParamsSchema = z.object({
  eventId: uuidSchema,
});

export type ResolveSecurityEventParamsInput = z.infer<
  typeof resolveSecurityEventParamsSchema
>;

export const securityAuditLogDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  userEmail: z.string().nullable().optional(),
  userName: z.string().nullable().optional(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable().optional(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
});

export type SecurityAuditLogDto = z.infer<typeof securityAuditLogDtoSchema>;

export const loginHistoryDtoSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  userId: z.string().uuid().nullable(),
  ipAddress: z.string(),
  userAgent: z.string(),
  success: z.boolean(),
  failureReason: z.string().nullable(),
  createdAt: z.string(),
});

export type LoginHistoryDto = z.infer<typeof loginHistoryDtoSchema>;

export const activeDeviceDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  userEmail: z.string().nullable().optional(),
  userName: z.string().nullable().optional(),
  deviceName: z.string(),
  ipAddress: z.string(),
  userAgent: z.string(),
  lastActiveAt: z.string(),
  createdAt: z.string(),
  isCurrent: z.boolean().optional(),
});

export type ActiveDeviceDto = z.infer<typeof activeDeviceDtoSchema>;

export const passwordHistoryItemDtoSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
});

export type PasswordHistoryItemDto = z.infer<
  typeof passwordHistoryItemDtoSchema
>;

export const securityEventDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  userEmail: z.string().nullable().optional(),
  severity: securitySeveritySchema,
  category: securityEventCategorySchema,
  eventType: z.string(),
  message: z.string(),
  metadata: z.record(z.unknown()).nullable().optional(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
});

export type SecurityEventDto = z.infer<typeof securityEventDtoSchema>;

export const passwordStatusDtoSchema = z.object({
  passwordSet: z.boolean(),
  passwordChangedAt: z.string().nullable(),
  historyCount: z.number().int().min(0),
  reusePreventionCount: z.number().int().min(1),
  lastLoginAt: z.string().nullable(),
  twoFactorEnabled: z.boolean(),
  failedLoginCount: z.number().int().min(0),
  lockedUntil: z.string().nullable(),
  isLocked: z.boolean(),
});

export type PasswordStatusDto = z.infer<typeof passwordStatusDtoSchema>;

export const securityScoreDtoSchema = z.object({
  score: z.number().int().min(0).max(100),
  grade: z.enum(["A", "B", "C", "D", "F"]),
  factors: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      passed: z.boolean(),
      weight: z.number().int().min(0),
    }),
  ),
});

export type SecurityScoreDto = z.infer<typeof securityScoreDtoSchema>;

export const securityDashboardDtoSchema = z.object({
  overview: z.object({
    activeSessions: z.number().int().min(0),
    successfulLogins24h: z.number().int().min(0),
    failedLogins24h: z.number().int().min(0),
    lockedAccounts: z.number().int().min(0),
    unresolvedAlerts: z.number().int().min(0),
    auditEvents24h: z.number().int().min(0),
  }),
  passwordStatus: passwordStatusDtoSchema,
  securityScore: securityScoreDtoSchema,
  recentLogins: z.array(loginHistoryDtoSchema),
  activeDevices: z.array(activeDeviceDtoSchema),
  alerts: z.array(securityEventDtoSchema),
  auditTimeline: z.array(securityAuditLogDtoSchema),
});

export type SecurityDashboardDto = z.infer<typeof securityDashboardDtoSchema>;
