import {
  canAccessModule,
  canAccessRoute,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  hasRole,
  type ModuleKey,
  type PermissionKey,
  type PermissionSubject,
  UserRole,
} from "@enterprise/shared";

/**
 * Server-side permission service — reuse across controllers and services.
 * Prefer middleware for HTTP boundary checks; use this for in-handler logic.
 */
export const permissionService = {
  hasRole(subject: PermissionSubject | null | undefined, ...roles: UserRole[]) {
    return hasRole(subject, ...roles);
  },

  hasPermission(
    subject: PermissionSubject | null | undefined,
    permission: PermissionKey | string,
  ) {
    return hasPermission(subject, permission);
  },

  hasAnyPermission(
    subject: PermissionSubject | null | undefined,
    permissions: readonly (PermissionKey | string)[],
  ) {
    return hasAnyPermission(subject, permissions);
  },

  hasAllPermissions(
    subject: PermissionSubject | null | undefined,
    permissions: readonly (PermissionKey | string)[],
  ) {
    return hasAllPermissions(subject, permissions);
  },

  canAccessRoute(
    subject: PermissionSubject | null | undefined,
    pathname: string,
  ) {
    return canAccessRoute(subject, pathname);
  },

  canAccessModule(
    subject: PermissionSubject | null | undefined,
    module: ModuleKey,
  ) {
    return canAccessModule(subject, module);
  },
};
