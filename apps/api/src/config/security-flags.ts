/**
 * API-side security feature flags (Phase 4 Phase 2).
 * Reads SECURITY_* and NEXT_PUBLIC_SECURITY_* (defaults OFF).
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

export function isApiSecurityRateLimitingEnabled(): boolean {
  return flag(
    "SECURITY_RATE_LIMITING",
    "NEXT_PUBLIC_SECURITY_RATE_LIMITING",
    "SECURITY_RATE_LIMIT_HARDENING",
    "NEXT_PUBLIC_SECURITY_RATE_LIMIT_HARDENING",
  );
}

export function isApiSecurityPermissionRefreshEnabled(): boolean {
  return flag(
    "SECURITY_PERMISSION_REFRESH",
    "NEXT_PUBLIC_SECURITY_PERMISSION_REFRESH",
    "SECURITY_PERMISSION_ENFORCEMENT",
    "NEXT_PUBLIC_SECURITY_PERMISSION_ENFORCEMENT",
  );
}

export function isApiSecurityUploadHardeningEnabled(): boolean {
  return flag(
    "SECURITY_UPLOAD_HARDENING",
    "NEXT_PUBLIC_SECURITY_UPLOAD_HARDENING",
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

export function isApiSecuritySecureCookiesEnabled(): boolean {
  return flag(
    "SECURITY_SECURE_COOKIES",
    "NEXT_PUBLIC_SECURITY_SECURE_COOKIES",
    "SECURITY_SESSION_HARDENING",
    "NEXT_PUBLIC_SECURITY_SESSION_HARDENING",
  );
}
