/**
 * Fail-closed MFA enrollment gate for ADMIN / SUPER_ADMIN.
 * Reuses the password-change allowlist pattern.
 */

import { AUTH_ERROR_CODES } from "@enterprise/shared";

import { AuthError } from "../../../modules/auth/auth.errors.js";
import { isMfaMandatoryRole } from "../../../modules/auth/mfa/index.js";
import { writeAuditLogSafe } from "../write-audit-log.js";
import type { AllowedEndpointRule } from "../password-policy/password-policy.types.js";

export const MFA_ENROLLMENT_AUDIT = {
  BLOCKED: "auth.mfa.enrollment_blocked",
  RESOURCE: "auth.mfa",
} as const;

export const MFA_ENROLLMENT_REQUIRED_MESSAGE =
  "Multi-factor authentication enrollment is required before accessing privileged APIs.";

/**
 * Minimum routes allowed while ADMIN/SUPER_ADMIN MFA is not enrolled.
 * Paths are relative to /api/v1.
 */
const ALLOWED_WHILE_MFA_ENROLLMENT_REQUIRED: readonly AllowedEndpointRule[] = [
  { method: "POST", path: "/auth/logout" },
  { method: "GET", path: "/auth/me" },
  { method: "GET", path: "/users/me" },
  // Legacy / alternate profile mounts
  { method: "GET", path: "/profile" },
  { method: "PATCH", path: "/profile" },
  { method: "PUT", path: "/profile" },
  // Actual settings profile surface used by the web app
  { method: "GET", path: "/settings/overview" },
  { method: "*", path: "/settings/profile", prefix: true, anyMethod: true },
  { method: "GET", path: "/security/csrf-token" },
  { method: "GET", path: "/security/password-status" },
  { method: "GET", path: "/security/mfa-status" },
  { method: "*", path: "/auth/mfa", prefix: true, anyMethod: true },
  // Password change may still be required concurrently
  { method: "POST", path: "/security/password/change" },
  { method: "POST", path: "/auth/change-password" },
] as const;

function normalizeApiPath(raw: string): string {
  const withoutQuery = (raw.split("?")[0] ?? raw).replace(/\/{2,}/g, "/");
  const stripped = withoutQuery.replace(/^\/api\/v\d+/, "");
  if (!stripped || stripped === "") return "/";
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

export type EnforceMfaEnrollmentContext = {
  userId: string;
  role: string;
  twoFactorEnabled: boolean;
  method: string;
  path: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export function isMfaEnrollmentAllowedEndpoint(
  method: string,
  path: string,
): boolean {
  const normalizedPath = normalizeApiPath(path);
  const normalizedMethod = method.toUpperCase();

  for (const rule of ALLOWED_WHILE_MFA_ENROLLMENT_REQUIRED) {
    const methodOk =
      rule.anyMethod ||
      rule.method === "*" ||
      rule.method.toUpperCase() === normalizedMethod;
    if (!methodOk) continue;

    if (rule.prefix) {
      if (
        normalizedPath === rule.path ||
        normalizedPath.startsWith(`${rule.path}/`)
      ) {
        return true;
      }
      continue;
    }

    if (normalizedPath === rule.path) {
      return true;
    }
  }

  return false;
}

/**
 * Block privileged APIs when ADMIN/SUPER_ADMIN has not enrolled MFA.
 * CLIENT / EMPLOYEE / other roles are unchanged.
 */
export async function enforceMfaEnrollment(
  context: EnforceMfaEnrollmentContext,
): Promise<void> {
  if (!isMfaMandatoryRole(context.role)) {
    return;
  }
  if (context.twoFactorEnabled) {
    return;
  }
  if (isMfaEnrollmentAllowedEndpoint(context.method, context.path)) {
    return;
  }

    await writeAuditLogSafe(
      {
        userId: context.userId,
        action: MFA_ENROLLMENT_AUDIT.BLOCKED,
        resource: MFA_ENROLLMENT_AUDIT.RESOURCE,
        resourceId: context.userId,
        metadata: {
          path: context.path,
          method: context.method,
          role: context.role,
          reason: "mfa_enrollment_required",
        },
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      },
      "mfa-enrollment-gate",
    );

  throw new AuthError(
    MFA_ENROLLMENT_REQUIRED_MESSAGE,
    403,
    AUTH_ERROR_CODES.MFA_ENROLLMENT_REQUIRED,
  );
}

export function mfaEnrollmentAllowedEndpoints(): readonly AllowedEndpointRule[] {
  return ALLOWED_WHILE_MFA_ENROLLMENT_REQUIRED;
}
