"use client";

import type { PermissionKey, UserRole } from "@enterprise/shared";
import type { ReactNode } from "react";

import {
  useHasAllPermissions,
  useHasAnyPermission,
  useHasPermission,
  useRole,
} from "../hooks/use-permissions";

interface GuardBaseProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface RoleGuardProps extends GuardBaseProps {
  roles: UserRole[];
}

export function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const { hasRole } = useRole();

  if (!hasRole(...roles)) {
    return fallback;
  }

  return children;
}

interface PermissionGuardProps extends GuardBaseProps {
  permission: PermissionKey | string;
}

export function PermissionGuard({
  permission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const allowed = useHasPermission(permission);

  if (!allowed) {
    return fallback;
  }

  return children;
}

interface AnyPermissionGuardProps extends GuardBaseProps {
  permissions: readonly (PermissionKey | string)[];
}

export function AnyPermissionGuard({
  permissions,
  children,
  fallback = null,
}: AnyPermissionGuardProps) {
  const allowed = useHasAnyPermission(permissions);

  if (!allowed) {
    return fallback;
  }

  return children;
}

interface AllPermissionsGuardProps extends GuardBaseProps {
  permissions: readonly (PermissionKey | string)[];
}

export function AllPermissionsGuard({
  permissions,
  children,
  fallback = null,
}: AllPermissionsGuardProps) {
  const allowed = useHasAllPermissions(permissions);

  if (!allowed) {
    return fallback;
  }

  return children;
}
