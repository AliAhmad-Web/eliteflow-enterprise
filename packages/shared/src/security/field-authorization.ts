/**
 * Centralized field-level authorization for enterprise DTO minimization.
 * Server-side only — never trust the client for restricted field visibility.
 *
 * Gate for RESTRICTED employee/compensation fields: team:manage (or admin roles).
 * No new DB permission keys required (backward compatible with existing seeds).
 */

import { UserRole } from "../enums/auth.enums.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { hasPermission, type PermissionSubject } from "../utils/permission-engine.js";
import { applyResponseMasking } from "./data-redaction.js";

/** Employee profile response tiers. */
export type EmployeeDtoView = "public" | "self" | "hr";

/**
 * Fields that must never appear on directory/list responses and require HR
 * authorization on profile responses.
 */
export const RESTRICTED_EMPLOYEE_FIELDS = [
  "salary",
  "nationalId",
  "qrToken",
] as const;

export type RestrictedEmployeeField =
  (typeof RESTRICTED_EMPLOYEE_FIELDS)[number];

/** Promotion compensation fields. */
export const RESTRICTED_PROMOTION_FIELDS = ["oldSalary", "newSalary"] as const;

export type RestrictedPromotionField =
  (typeof RESTRICTED_PROMOTION_FIELDS)[number];

/**
 * Secrets that must never be serialized into API DTOs under any view.
 * (Enforced by mappers; listed here as the canonical deny-list.)
 */
export const NEVER_EXPOSE_FIELDS = [
  "passwordHash",
  "tokenHash",
  "refreshTokenHash",
  "codeHash",
  "accessToken",
  "refreshToken",
  "encryptedSecret",
  "iv",
  "authTag",
  "temporaryPassword",
  "rawToken",
  "setupToken",
] as const;

/** Confidential personal fields omitted from directory/public DTOs. */
export const DIRECTORY_OMIT_FIELDS = [
  "notes",
  "personalEmail",
  "address",
  "city",
  "country",
  "emergencyContactName",
  "emergencyContactPhone",
  "emergencyContactRelation",
  "dateOfBirth",
  "gender",
  "maritalStatus",
  "bloodGroup",
  "fatherName",
  "exitReason",
  "documentUrls",
  "annualLeaveBalance",
  "casualLeaveBalance",
  "sickLeaveBalance",
  "medicalLeaveBalance",
] as const;

export interface FieldAccessActor extends PermissionSubject {
  userId: string;
}

export interface FieldAccessSubject {
  /** User id owning the employee profile (EmployeeProfile.userId). */
  userId: string;
}

function isPrivilegedHr(actor: PermissionSubject): boolean {
  if (
    actor.role === UserRole.SUPER_ADMIN ||
    actor.role === UserRole.ADMIN
  ) {
    return true;
  }
  return (
    hasPermission(actor, PERMISSIONS.TEAM_MANAGE) ||
    actor.permissions.includes("*")
  );
}

/** Whether actor may read RESTRICTED HR fields (salary, nationalId, qrToken). */
export function canReadRestrictedEmployeeFields(
  actor: PermissionSubject | null | undefined,
): boolean {
  if (!actor) return false;
  return isPrivilegedHr(actor);
}

/** Whether actor may read promotion salary fields. */
export function canReadRestrictedPromotionFields(
  actor: PermissionSubject | null | undefined,
): boolean {
  return canReadRestrictedEmployeeFields(actor);
}

/** One-time password setup link reveal (hire / reset) — HR/admin only. */
export function canRevealPasswordSetup(
  actor: PermissionSubject | null | undefined,
): boolean {
  return canReadRestrictedEmployeeFields(actor);
}

/**
 * @deprecated Use canRevealPasswordSetup. Temporary passwords are removed.
 */
export function canRevealTemporaryPassword(
  actor: PermissionSubject | null | undefined,
): boolean {
  return canRevealPasswordSetup(actor);
}

/** Whether actor may see a specific restricted employee field. */
export function canReadEmployeeField(
  actor: PermissionSubject | null | undefined,
  field: RestrictedEmployeeField,
): boolean {
  void field;
  return canReadRestrictedEmployeeFields(actor);
}

/**
 * Resolve DTO view for an employee profile response.
 * - list/directory callers should force `"public"`.
 * - detail/profile uses this resolver.
 */
export function resolveEmployeeDtoView(
  actor: FieldAccessActor,
  subject: FieldAccessSubject,
  options?: { forcePublic?: boolean },
): EmployeeDtoView {
  if (options?.forcePublic) {
    return "public";
  }
  if (canReadRestrictedEmployeeFields(actor)) {
    return "hr";
  }
  if (actor.userId === subject.userId) {
    return "self";
  }
  return "public";
}

/**
 * Strip unauthorized fields from an employee-shaped DTO.
 * Restricted keys are omitted (not null) so they are absent from JSON.
 *
 * - public: directory minimum (no RESTRICTED, no confidential personal block)
 * - self: personal profile without compensation / qrToken
 * - hr: full authorized profile including RESTRICTED
 */
export function applyEmployeeDtoFieldPolicy<T extends Record<string, unknown>>(
  dto: T,
  view: EmployeeDtoView,
): T {
  const next: Record<string, unknown> = { ...dto };

  for (const key of NEVER_EXPOSE_FIELDS) {
    if (key in next) {
      delete next[key];
    }
  }

  if (view === "hr") {
    return next as T;
  }

  // RESTRICTED: HR/Admin only (salary, nationalId, qrToken)
  for (const key of RESTRICTED_EMPLOYEE_FIELDS) {
    delete next[key];
  }

  if (view === "self") {
    return next as T;
  }

  // public / directory — also drop confidential personal block
  for (const key of DIRECTORY_OMIT_FIELDS) {
    delete next[key];
  }

  // Display-safe masking for remaining directory contact fields
  return applyResponseMasking(next) as T;
}

/**
 * Sanitize promotion records for API responses.
 * Unauthorized callers get oldSalary/newSalary omitted.
 */
export function applyPromotionDtoFieldPolicy<T extends Record<string, unknown>>(
  dto: T,
  actor: PermissionSubject | null | undefined,
): T {
  const next: Record<string, unknown> = { ...dto };
  if (!canReadRestrictedPromotionFields(actor)) {
    delete next.oldSalary;
    delete next.newSalary;
  }
  return next as T;
}

/**
 * Build hire/reset credential payload — passwordSetupUrl only when authorized.
 * Never includes temporaryPassword.
 */
export function applyCredentialRevealPolicy<
  T extends {
    passwordSetupUrl?: string;
    qrToken?: string | null;
    temporaryPassword?: string;
  },
>(payload: T, actor: PermissionSubject | null | undefined): T {
  const next = { ...payload };
  // Hard deny — temporary passwords must never leave the server
  delete next.temporaryPassword;

  if (canRevealPasswordSetup(actor)) {
    return next;
  }
  delete next.passwordSetupUrl;
  delete next.qrToken;
  return next;
}
