import { UserRole } from "../enums/auth.enums.js";
import {
  MODULE_PERMISSIONS,
  PERMISSIONS,
  ROUTE_PERMISSIONS,
  type ModuleKey,
  type PermissionKey,
} from "../constants/permissions.js";
import { ROLE_HIERARCHY } from "../constants/roles.js";

export interface PermissionSubject {
  role: UserRole | string;
  permissions: readonly string[];
}

export function hasRole(
  subject: PermissionSubject | null | undefined,
  ...roles: UserRole[]
): boolean {
  if (!subject?.role || roles.length === 0) {
    return false;
  }

  return roles.includes(String(subject.role).toUpperCase() as UserRole);
}

export function hasAnyRole(
  subject: PermissionSubject | null | undefined,
  roles: readonly UserRole[],
): boolean {
  return hasRole(subject, ...roles);
}

export function hasMinimumRole(
  subject: PermissionSubject | null | undefined,
  minimumRole: UserRole,
): boolean {
  if (!subject?.role) {
    return false;
  }

  const current = ROLE_HIERARCHY[subject.role as UserRole];
  const required = ROLE_HIERARCHY[minimumRole];

  if (current === undefined || required === undefined) {
    return false;
  }

  return current >= required;
}

export function hasPermission(
  subject: PermissionSubject | null | undefined,
  permission: PermissionKey | string,
): boolean {
  if (!subject?.permissions?.length) {
    return false;
  }

  if (subject.permissions.includes(permission)) {
    return true;
  }

  // chat:write historically granted module access before chat:read existed.
  // Accept it so stale JWTs still pass RoutePermissionGuard for /messages.
  if (
    permission === PERMISSIONS.CHAT_READ &&
    subject.permissions.includes(PERMISSIONS.CHAT_WRITE)
  ) {
    return true;
  }

  // Phase 20 — communication:* supersedes chat:* for hub routes; accept either.
  if (
    permission === PERMISSIONS.COMMUNICATION_READ &&
    (subject.permissions.includes(PERMISSIONS.COMMUNICATION_WRITE) ||
      subject.permissions.includes(PERMISSIONS.COMMUNICATION_MANAGE) ||
      subject.permissions.includes(PERMISSIONS.CHAT_READ) ||
      subject.permissions.includes(PERMISSIONS.CHAT_WRITE))
  ) {
    return true;
  }

  if (
    permission === PERMISSIONS.COMMUNICATION_WRITE &&
    (subject.permissions.includes(PERMISSIONS.COMMUNICATION_MANAGE) ||
      subject.permissions.includes(PERMISSIONS.CHAT_WRITE))
  ) {
    return true;
  }

  if (
    permission === PERMISSIONS.CHAT_READ &&
    (subject.permissions.includes(PERMISSIONS.COMMUNICATION_READ) ||
      subject.permissions.includes(PERMISSIONS.COMMUNICATION_WRITE) ||
      subject.permissions.includes(PERMISSIONS.COMMUNICATION_MANAGE))
  ) {
    return true;
  }

  if (
    permission === PERMISSIONS.CHAT_WRITE &&
    (subject.permissions.includes(PERMISSIONS.COMMUNICATION_WRITE) ||
      subject.permissions.includes(PERMISSIONS.COMMUNICATION_MANAGE))
  ) {
    return true;
  }

  return false;
}

export function hasAnyPermission(
  subject: PermissionSubject | null | undefined,
  permissions: readonly (PermissionKey | string)[],
): boolean {
  if (!subject?.permissions?.length || permissions.length === 0) {
    return false;
  }

  return permissions.some((permission) => hasPermission(subject, permission));
}

export function hasAllPermissions(
  subject: PermissionSubject | null | undefined,
  permissions: readonly (PermissionKey | string)[],
): boolean {
  if (!subject?.permissions?.length || permissions.length === 0) {
    return false;
  }

  return permissions.every((permission) => hasPermission(subject, permission));
}

export function canAccessModule(
  subject: PermissionSubject | null | undefined,
  module: ModuleKey,
): boolean {
  const permission = MODULE_PERMISSIONS[module];
  return hasPermission(subject, permission);
}

export function resolveRoutePermission(
  pathname: string,
): PermissionKey | undefined {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  const exact = ROUTE_PERMISSIONS[normalized];
  if (exact) {
    return exact;
  }

  const match = Object.keys(ROUTE_PERMISSIONS)
    .sort((a, b) => b.length - a.length)
    .find(
      (route) =>
        normalized === route || normalized.startsWith(`${route}/`),
    );

  return match ? ROUTE_PERMISSIONS[match] : undefined;
}

export function canAccessRoute(
  subject: PermissionSubject | null | undefined,
  pathname: string,
): boolean {
  const required = resolveRoutePermission(pathname);

  if (!required) {
    return Boolean(subject);
  }

  return hasPermission(subject, required);
}

export const permissionEngine = {
  hasRole,
  hasAnyRole,
  hasMinimumRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessModule,
  canAccessRoute,
  resolveRoutePermission,
};
