"use client";

import { UserRole } from "@enterprise/shared";

import { DashboardContent } from "@/features/dashboard/components/dashboard-content";
import { RoleRouteGuard } from "@/features/rbac/components/role-route-guard";

const OPERATIONS_ROLES = [UserRole.ADMIN, UserRole.SUPER_ADMIN] as const;

export function DashboardPageClient() {
  return (
    <RoleRouteGuard allowedRoles={OPERATIONS_ROLES}>
      <DashboardContent />
    </RoleRouteGuard>
  );
}
