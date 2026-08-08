import {
  REDACTED,
  UserRole,
  canReadRestrictedEmployeeFields,
  type PermissionSubject,
} from "@enterprise/shared";

/** Placeholder for scrubbed AI payloads (never store secrets). */
export const AI_REDACTED = REDACTED;

export const AI_DATA_POLICY_AUDIT = {
  RESTRICTED_DATA_BLOCKED: "AI_RESTRICTED_DATA_BLOCKED",
  POLICY_DENIED: "AI_POLICY_DENIED",
} as const;

export type AiDataPolicyAuditAction =
  (typeof AI_DATA_POLICY_AUDIT)[keyof typeof AI_DATA_POLICY_AUDIT];

/**
 * Actor shape for AI data classification decisions.
 * `explicitRestrictedAccess` is required for Super Admin to see RESTRICTED fields.
 */
export interface AiDataPolicySubject {
  userId?: string | null;
  role?: string | null;
  permissions?: readonly string[] | null;
  /** Super Admin only — must be true to receive RESTRICTED data. */
  explicitRestrictedAccess?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export type AiDataPolicyResource =
  | "context"
  | "memory"
  | "document"
  | "search"
  | "tool"
  | "analytics"
  | "summary"
  | "restricted_hr"
  | "ai_surface";

/** Keys / token patterns that must never reach AI by default. */
export const AI_RESTRICTED_KEY_RE =
  /^(.*)?(salary|compensation|oldsalary|newsalary|nationalid|passport|tax(id|number|identifier)?|registrationnumber|qrtoken|qrpayload|oauth|accesstoken|refreshtoken|password|passwordhash|passwd|temporarypassword|passwordsetupurl|setupurl|setuptoken|rawtoken|recoverycode|recoverycodes|mfasecret|twofactorsecret|totp|otp|encryptionkey|apikey|clientsecret|privatekey|integrationsecret|bank(account|iban|routing)?|notes|hrnotes|confidentialnotes)(.*)?$/i;

export const AI_RESTRICTED_TEXT_RE =
  /\b(salary|compensation|national\s*id|passport|tax\s*(id|number|identifier)|qr\s*token|oauth|access\s*token|refresh\s*token|password\s*hash|temporary\s*password|password\s*setup\s*url|setup\s*url|recovery\s*code|mfa\s*secret|encryption\s*key|api\s*key|client\s*secret|private\s*key|iban|bank\s*account)\b/gi;

export function toPermissionSubject(
  subject: AiDataPolicySubject,
): PermissionSubject {
  return {
    role: (subject.role as PermissionSubject["role"]) ?? UserRole.EMPLOYEE,
    permissions: [...(subject.permissions ?? [])],
  };
}

/**
 * Whether this AI actor may receive RESTRICTED enterprise fields.
 * - Client / Employee: never
 * - Admin: when existing RBAC permits (team:manage / admin roles)
 * - Super Admin: only when explicitRestrictedAccess is true
 */
export function canAiReceiveRestrictedData(
  subject: AiDataPolicySubject | null | undefined,
): boolean {
  if (!subject?.role) return false;

  const role = subject.role;
  if (role === UserRole.CLIENT || role === "CLIENT") {
    return false;
  }
  if (role === UserRole.EMPLOYEE || role === "EMPLOYEE") {
    return false;
  }
  if (role === UserRole.SUPER_ADMIN || role === "SUPER_ADMIN") {
    return subject.explicitRestrictedAccess === true;
  }
  if (role === UserRole.ADMIN || role === "ADMIN") {
    return canReadRestrictedEmployeeFields(toPermissionSubject(subject));
  }

  return canReadRestrictedEmployeeFields(toPermissionSubject(subject));
}

export function isAiRestrictedKey(key: string): boolean {
  const normalized = key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return (
    AI_RESTRICTED_KEY_RE.test(normalized) || AI_RESTRICTED_KEY_RE.test(key)
  );
}
