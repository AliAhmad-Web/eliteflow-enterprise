"use client";

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
import { useCallback, useMemo } from "react";

import { useAuthStore } from "@/features/auth/stores/auth.store";

function usePermissionSubject(): PermissionSubject | null {
  const user = useAuthStore((state) => state.user);

  return useMemo(() => {
    if (!user) {
      return null;
    }

    return {
      role: user.role.code,
      permissions: user.permissions,
    };
  }, [user]);
}

export function usePermissions() {
  const subject = usePermissionSubject();
  const user = useAuthStore((state) => state.user);
  const role = (user?.role.code as UserRole | undefined) ?? null;
  const permissions = user?.permissions ?? [];

  const checkPermission = useCallback(
    (permission: PermissionKey | string) => hasPermission(subject, permission),
    [subject],
  );
  const checkAnyPermission = useCallback(
    (keys: readonly (PermissionKey | string)[]) =>
      hasAnyPermission(subject, keys),
    [subject],
  );
  const checkAllPermissions = useCallback(
    (keys: readonly (PermissionKey | string)[]) =>
      hasAllPermissions(subject, keys),
    [subject],
  );
  const checkRole = useCallback(
    (...roles: UserRole[]) => hasRole(subject, ...roles),
    [subject],
  );
  const checkRoute = useCallback(
    (pathname: string) => canAccessRoute(subject, pathname),
    [subject],
  );
  const checkModule = useCallback(
    (module: ModuleKey) => canAccessModule(subject, module),
    [subject],
  );

  return useMemo(
    () => ({
      subject,
      permissions,
      role,
      hasPermission: checkPermission,
      hasAnyPermission: checkAnyPermission,
      hasAllPermissions: checkAllPermissions,
      hasRole: checkRole,
      canAccessRoute: checkRoute,
      canAccessModule: checkModule,
    }),
    [
      subject,
      permissions,
      role,
      checkPermission,
      checkAnyPermission,
      checkAllPermissions,
      checkRole,
      checkRoute,
      checkModule,
    ],
  );
}

export function useRole() {
  const { role, hasRole: checkRole } = usePermissions();

  return {
    role,
    isSuperAdmin: checkRole(UserRole.SUPER_ADMIN),
    isAdmin: checkRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
    isEmployee: checkRole(UserRole.EMPLOYEE),
    isClient: checkRole(UserRole.CLIENT),
    hasRole: checkRole,
  };
}

export function useCan() {
  const api = usePermissions();

  return {
    permission: api.hasPermission,
    anyPermission: api.hasAnyPermission,
    allPermissions: api.hasAllPermissions,
    role: api.hasRole,
    route: api.canAccessRoute,
    module: api.canAccessModule,
  };
}

export function useHasPermission(permission: PermissionKey | string): boolean {
  const { hasPermission: check } = usePermissions();
  return check(permission);
}

export function useHasAnyPermission(
  permissions: readonly (PermissionKey | string)[],
): boolean {
  const { hasAnyPermission: check } = usePermissions();
  return check(permissions);
}

export function useHasAllPermissions(
  permissions: readonly (PermissionKey | string)[],
): boolean {
  const { hasAllPermissions: check } = usePermissions();
  return check(permissions);
}
