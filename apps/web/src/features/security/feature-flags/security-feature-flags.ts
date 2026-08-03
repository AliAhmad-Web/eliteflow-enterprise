import { parseEnvFlag } from "@/features/ai/feature-flags";

import type {
  SecurityFeatureFlagId,
  SecurityFeatureFlags,
} from "./security-feature-flag.types";

/**
 * Centralized EliteFlow security feature flags (Phase 4).
 * Defaults OFF — existing auth / RBAC / middleware unchanged until enabled.
 */

export function isSecurityEnterpriseFoundationEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_SECURITY_ENTERPRISE_FOUNDATION,
    false,
  );
}

export function isSecurityHttpHeadersEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SECURITY_HTTP_HEADERS, false);
}

/** Phase 2 headers; also honors Phase 1 HTTP_HEADERS. */
export function isSecurityHeadersEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_SECURITY_HEADERS, false) ||
    isSecurityHttpHeadersEnabled()
  );
}

export function isSecurityCspEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SECURITY_CSP, false);
}

export function isSecuritySecureCookiesEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_SECURITY_SECURE_COOKIES,
    false,
  );
}

export function isSecuritySessionPoliciesEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_SECURITY_SESSION_POLICIES,
    false,
  );
}

export function isSecurityEdgeAuthEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SECURITY_EDGE_AUTH, false);
}

/**
 * Phase 2 session hardening (edge hint integrity + cookie alignment).
 * Also honors EDGE_AUTH, SESSION_POLICIES, SECURE_COOKIES.
 */
export function isSecuritySessionHardeningEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_SECURITY_SESSION_HARDENING, false) ||
    isSecurityEdgeAuthEnabled() ||
    isSecuritySessionPoliciesEnabled() ||
    isSecuritySecureCookiesEnabled()
  );
}

export function isSecurityAuditEnhancementEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_SECURITY_AUDIT_ENHANCEMENT,
    false,
  );
}

/** Phase 2 monitoring; also honors AUDIT_ENHANCEMENT. */
export function isSecurityMonitoringEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_SECURITY_MONITORING, false) ||
    isSecurityAuditEnhancementEnabled()
  );
}

export function isSecurityRateLimitHardeningEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_SECURITY_RATE_LIMIT_HARDENING,
    false,
  );
}

/** Phase 2 rate limiting; also honors RATE_LIMIT_HARDENING. */
export function isSecurityRateLimitingEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_SECURITY_RATE_LIMITING, false) ||
    isSecurityRateLimitHardeningEnabled()
  );
}

export function isSecurityRequestValidationEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_SECURITY_REQUEST_VALIDATION,
    false,
  );
}

export function isSecurityPermissionEnforcementEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_SECURITY_PERMISSION_ENFORCEMENT,
    false,
  );
}

/** Phase 2 permission refresh; also honors PERMISSION_ENFORCEMENT. */
export function isSecurityPermissionRefreshEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_SECURITY_PERMISSION_REFRESH, false) ||
    isSecurityPermissionEnforcementEnabled()
  );
}

export function isSecurityUploadHardeningEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_SECURITY_UPLOAD_HARDENING,
    false,
  );
}

export function isSecurityFeatureEnabled(
  flag: SecurityFeatureFlagId,
): boolean {
  switch (flag) {
    case "SECURITY_ENTERPRISE_FOUNDATION":
      return isSecurityEnterpriseFoundationEnabled();
    case "SECURITY_HTTP_HEADERS":
      return isSecurityHttpHeadersEnabled();
    case "SECURITY_HEADERS":
      return isSecurityHeadersEnabled();
    case "SECURITY_CSP":
      return isSecurityCspEnabled();
    case "SECURITY_SECURE_COOKIES":
      return isSecuritySecureCookiesEnabled();
    case "SECURITY_SESSION_POLICIES":
      return isSecuritySessionPoliciesEnabled();
    case "SECURITY_SESSION_HARDENING":
      return isSecuritySessionHardeningEnabled();
    case "SECURITY_AUDIT_ENHANCEMENT":
      return isSecurityAuditEnhancementEnabled();
    case "SECURITY_MONITORING":
      return isSecurityMonitoringEnabled();
    case "SECURITY_RATE_LIMIT_HARDENING":
      return isSecurityRateLimitHardeningEnabled();
    case "SECURITY_RATE_LIMITING":
      return isSecurityRateLimitingEnabled();
    case "SECURITY_REQUEST_VALIDATION":
      return isSecurityRequestValidationEnabled();
    case "SECURITY_PERMISSION_ENFORCEMENT":
      return isSecurityPermissionEnforcementEnabled();
    case "SECURITY_PERMISSION_REFRESH":
      return isSecurityPermissionRefreshEnabled();
    case "SECURITY_EDGE_AUTH":
      return isSecurityEdgeAuthEnabled();
    case "SECURITY_UPLOAD_HARDENING":
      return isSecurityUploadHardeningEnabled();
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}

export function getSecurityFeatureFlags(): SecurityFeatureFlags {
  return {
    SECURITY_ENTERPRISE_FOUNDATION: isSecurityEnterpriseFoundationEnabled(),
    SECURITY_HTTP_HEADERS: isSecurityHttpHeadersEnabled(),
    SECURITY_HEADERS: isSecurityHeadersEnabled(),
    SECURITY_CSP: isSecurityCspEnabled(),
    SECURITY_SECURE_COOKIES: isSecuritySecureCookiesEnabled(),
    SECURITY_SESSION_POLICIES: isSecuritySessionPoliciesEnabled(),
    SECURITY_SESSION_HARDENING: isSecuritySessionHardeningEnabled(),
    SECURITY_AUDIT_ENHANCEMENT: isSecurityAuditEnhancementEnabled(),
    SECURITY_MONITORING: isSecurityMonitoringEnabled(),
    SECURITY_RATE_LIMIT_HARDENING: isSecurityRateLimitHardeningEnabled(),
    SECURITY_RATE_LIMITING: isSecurityRateLimitingEnabled(),
    SECURITY_REQUEST_VALIDATION: isSecurityRequestValidationEnabled(),
    SECURITY_PERMISSION_ENFORCEMENT: isSecurityPermissionEnforcementEnabled(),
    SECURITY_PERMISSION_REFRESH: isSecurityPermissionRefreshEnabled(),
    SECURITY_EDGE_AUTH: isSecurityEdgeAuthEnabled(),
    SECURITY_UPLOAD_HARDENING: isSecurityUploadHardeningEnabled(),
  };
}
