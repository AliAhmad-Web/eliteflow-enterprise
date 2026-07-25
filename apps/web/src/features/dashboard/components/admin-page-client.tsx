"use client";

import { ADMIN_ROLES, PERMISSIONS } from "@enterprise/shared";

import { AdminConsoleContent } from "@/features/dashboard/components/admin-console-content";
import { RoleRouteGuard } from "@/features/rbac/components/role-route-guard";

export function AdminPageClient() {
  return (
    <RoleRouteGuard
      allowedRoles={ADMIN_ROLES}
      requiredPermission={PERMISSIONS.ADMIN_ACCESS}
    >
      <AdminConsoleContent />
    </RoleRouteGuard>
  );
}
