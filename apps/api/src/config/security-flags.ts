/**
 * API-side security feature flags (Phase 4 Phase 2).
 * Most SECURITY_* flags default OFF.
 * Upload hardening defaults ON and cannot be disabled in production.
 */

function parseEnvFlag(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return defaultValue;
  switch (normalized) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      return defaultValue;
  }
}

function flag(...keys: string[]): boolean {
  for (const key of keys) {
    if (parseEnvFlag(process.env[key], false)) return true;
  }
  return false;
}

/** First explicitly set env key wins; otherwise `defaultValue`. */
function flagWithDefault(defaultValue: boolean, ...keys: string[]): boolean {
  for (const key of keys) {
    const raw = process.env[key];
    if (raw !== undefined && raw.trim().length > 0) {
      return parseEnvFlag(raw, defaultValue);
    }
  }
  return defaultValue;
}

/**
 * Hardening overlay (≈70% budget). Distinct from RATE_LIMIT_ENABLED
 * (master switch for Redis-backed limiting — see rate-limit.config.ts).
 */
export function isApiSecurityRateLimitingEnabled(): boolean {
  return flag(
    "SECURITY_RATE_LIMITING",
    "NEXT_PUBLIC_SECURITY_RATE_LIMITING",
    "SECURITY_RATE_LIMIT_HARDENING",
    "NEXT_PUBLIC_SECURITY_RATE_LIMIT_HARDENING",
  );
}

/** Re-export master / fail-open helpers for security-flag consumers. */
export {
  isRateLimitEnabled,
  isRateLimitFailOpen,
} from "../shared/security/rate-limit/rate-limit.config.js";

export { isCsrfEnabled } from "../shared/security/csrf/csrf.config.js";

export {
  isSessionRiskEnabled,
  isSessionTrustedDeviceEnabled,
} from "../shared/security/session-hardening/session-hardening.config.js";

export {
  isDeviceManagementEnabled,
} from "../shared/security/device-management/device-management.config.js";

import { isTenantIsolationEnabled as tenantIsolationEnabled } from "../shared/security/tenant-isolation/tenant-isolation.config.js";

export { isTenantIsolationEnabled } from "../shared/security/tenant-isolation/tenant-isolation.config.js";

export function isApiTenantIsolationEnabled(): boolean {
  return tenantIsolationEnabled();
}

import { isSecurityRegressionEnabled as securityRegressionEnabled } from "../shared/security/security-regression/security-regression.config.js";

export { isSecurityRegressionEnabled } from "../shared/security/security-regression/security-regression.config.js";

export function isApiSecurityRegressionEnabled(): boolean {
  return securityRegressionEnabled();
}

import { isApiVersioningEnabled as apiVersioningEnabledFlag } from "../shared/api-versioning/api-version.config.js";

export { isApiVersioningEnabled } from "../shared/api-versioning/api-version.config.js";

export function isApiEnterpriseVersioningEnabled(): boolean {
  return apiVersioningEnabledFlag();
}

import { isWebhookSecurityEnabled as webhookSecurityEnabledFlag } from "../shared/security/webhooks/webhook.config.js";

export { isWebhookSecurityEnabled } from "../shared/security/webhooks/webhook.config.js";

export function isApiWebhookSecurityEnabled(): boolean {
  return webhookSecurityEnabledFlag();
}

export { isPromptSecurityEnabled } from "../modules/ai/foundation/security/prompt-security.config.js";

export function isApiSecurityPermissionRefreshEnabled(): boolean {
  return flag(
    "SECURITY_PERMISSION_REFRESH",
    "NEXT_PUBLIC_SECURITY_PERMISSION_REFRESH",
    "SECURITY_PERMISSION_ENFORCEMENT",
    "NEXT_PUBLIC_SECURITY_PERMISSION_ENFORCEMENT",
  );
}

/**
 * Upload hardening defaults ON.
 * Explicit `false`/`off` disables it (non-production only — see assert).
 */
export function isApiSecurityUploadHardeningEnabled(): boolean {
  return flagWithDefault(
    true,
    "SECURITY_UPLOAD_HARDENING",
    "NEXT_PUBLIC_SECURITY_UPLOAD_HARDENING",
  );
}

/**
 * Production fail-closed: refusing to boot when upload hardening is disabled.
 */
export function assertProductionUploadHardeningEnabled(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (isApiSecurityUploadHardeningEnabled()) return;

  throw new Error(
    "[security] SECURITY_UPLOAD_HARDENING cannot be disabled in production. " +
      "Remove SECURITY_UPLOAD_HARDENING=false / NEXT_PUBLIC_SECURITY_UPLOAD_HARDENING=false " +
      "or set the flag to true.",
  );
}

export function isApiSecurityMonitoringEnabled(): boolean {
  return flag(
    "SECURITY_MONITORING",
    "NEXT_PUBLIC_SECURITY_MONITORING",
    "SECURITY_AUDIT_ENHANCEMENT",
    "NEXT_PUBLIC_SECURITY_AUDIT_ENHANCEMENT",
  );
}

/** Enterprise SIEM export pipeline (defaults OFF). */
export function isApiSiemEnabled(): boolean {
  return flag("SECURITY_SIEM_ENABLED", "SIEM_ENABLED");
}

/** Enterprise Backup Validation (defaults ON). Validation only — no backup creation. */
export function isApiBackupValidationEnabled(): boolean {
  return flagWithDefault(
    true,
    "SECURITY_BACKUP_VALIDATION_ENABLED",
    "BACKUP_VALIDATION_ENABLED",
  );
}

/** Enterprise Encryption Audit (defaults ON). Audit only — no encryption/rotation. */
export function isApiEncryptionAuditEnabled(): boolean {
  return flagWithDefault(
    true,
    "SECURITY_ENCRYPTION_AUDIT_ENABLED",
    "ENCRYPTION_AUDIT_ENABLED",
  );
}

/** Enterprise Disaster Recovery Test (defaults ON). Simulation only. */
export function isApiDisasterRecoveryTestEnabled(): boolean {
  return flagWithDefault(
    true,
    "SECURITY_DISASTER_RECOVERY_TEST_ENABLED",
    "DISASTER_RECOVERY_TEST_ENABLED",
  );
}

/** Enterprise External Penetration Test assessment (defaults ON). Assessment only. */
export function isApiPentestEnabled(): boolean {
  return flagWithDefault(
    true,
    "SECURITY_PENTEST_ENABLED",
    "PENTEST_ENABLED",
  );
}

export function isApiSecuritySecureCookiesEnabled(): boolean {
  return flag(
    "SECURITY_SECURE_COOKIES",
    "NEXT_PUBLIC_SECURITY_SECURE_COOKIES",
    "SECURITY_SESSION_HARDENING",
    "NEXT_PUBLIC_SECURITY_SESSION_HARDENING",
  );
}

/**
 * Zero Trust continuous evaluation (Phase 3 Step 11).
 * Defaults ON — set SECURITY_ZERO_TRUST=false to disable evaluation.
 */
export function isApiZeroTrustEnabled(): boolean {
  return flagWithDefault(
    true,
    "SECURITY_ZERO_TRUST",
    "NEXT_PUBLIC_SECURITY_ZERO_TRUST",
  );
}

/**
 * When enabled (default ON), BLOCK / REQUIRE_STEP_UP decisions are enforced.
 * Evaluation still runs when Zero Trust is enabled and enforcement is off.
 */
export function isApiZeroTrustEnforcementEnabled(): boolean {
  if (!isApiZeroTrustEnabled()) return false;
  return flagWithDefault(
    true,
    "SECURITY_ZERO_TRUST_ENFORCEMENT",
    "NEXT_PUBLIC_SECURITY_ZERO_TRUST_ENFORCEMENT",
  );
}

/**
 * Production HTTP security headers (Phase 1 Step 4).
 * Defaults ON in all environments (CSP is relaxed in non-production).
 */
export function isApiSecurityHeadersEnabled(): boolean {
  return flagWithDefault(
    true,
    "SECURITY_HEADERS_ENABLED",
    "NEXT_PUBLIC_SECURITY_HEADERS_ENABLED",
  );
}

export function isApiCspEnabled(): boolean {
  return flagWithDefault(true, "CSP_ENABLED", "SECURITY_CSP_ENABLED");
}

/** HSTS is production-only even when this flag is true. */
export function isApiHstsEnabled(): boolean {
  return flagWithDefault(true, "HSTS_ENABLED", "SECURITY_HSTS_ENABLED");
}

export function isApiPermissionsPolicyEnabled(): boolean {
  return flagWithDefault(
    true,
    "PERMISSIONS_POLICY_ENABLED",
    "SECURITY_PERMISSIONS_POLICY_ENABLED",
  );
}

/**
 * Cross-Origin-Embedder-Policy. Defaults OFF — require-corp breaks many
 * cross-origin asset/API flows unless the entire stack opts in.
 */
export function isApiCoepEnabled(): boolean {
  return flagWithDefault(false, "COEP_ENABLED", "SECURITY_COEP_ENABLED");
}

/**
 * Cross-Origin-Resource-Policy. Default `cross-origin` preserves SPA file
 * preview/download across web/API origins. Override via SECURITY_HEADERS_CORP.
 */
export function getApiCrossOriginResourcePolicy():
  | "same-origin"
  | "same-site"
  | "cross-origin" {
  const raw = (process.env.SECURITY_HEADERS_CORP ?? "cross-origin")
    .trim()
    .toLowerCase();
  switch (raw) {
    case "same-origin":
    case "same-site":
    case "cross-origin":
      return raw;
    default:
      return "cross-origin";
  }
}
