import { UserRole } from "../enums/auth.enums.js";

/**
 * Role hierarchy for privilege comparisons (higher number = more privilege).
 * Does not replace permission checks — used for role-only guards.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.CLIENT]: 1,
  [UserRole.EMPLOYEE]: 2,
  [UserRole.ADMIN]: 3,
  [UserRole.SUPER_ADMIN]: 4,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: "Super Admin",
  [UserRole.ADMIN]: "Admin",
  [UserRole.EMPLOYEE]: "Employee",
  [UserRole.CLIENT]: "Client",
};

/** Roles allowed on the main dashboard shell */
export const DASHBOARD_ROLES: readonly UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.EMPLOYEE,
] as const;

/** Roles allowed on the admin console */
export const ADMIN_ROLES: readonly UserRole[] = [
  UserRole.SUPER_ADMIN,
] as const;

/** Roles allowed on the client portal */
export const PORTAL_ROLES: readonly UserRole[] = [
  UserRole.CLIENT,
] as const;
