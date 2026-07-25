"use client";

import {
  canAccessRoute,
  hasAnyPermission,
  hasPermission,
  type PermissionKey,
  type PermissionSubject,
  type UserRole,
} from "@enterprise/shared";

import type { NavigationItem, NavigationSection } from "@/config/navigation.config";

export function filterNavigationByAccess(
  sections: NavigationSection[],
  subject: PermissionSubject | null,
): NavigationSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        canAccessNavItem(item, subject),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

export function canAccessNavItem(
  item: NavigationItem,
  subject: PermissionSubject | null,
): boolean {
  if (item.roles && item.roles.length > 0) {
    if (!subject?.role || !item.roles.includes(subject.role as UserRole)) {
      return false;
    }
  }

  if (item.permission) {
    return hasPermission(subject, item.permission);
  }

  if (item.anyPermissions && item.anyPermissions.length > 0) {
    return hasAnyPermission(subject, item.anyPermissions);
  }

  return canAccessRoute(subject, item.href);
}

export function filterActionsByPermission<
  T extends { permission?: PermissionKey | string },
>(actions: T[], subject: PermissionSubject | null): T[] {
  return actions.filter((action) => {
    if (!action.permission) {
      return true;
    }

    return hasPermission(subject, action.permission);
  });
}
