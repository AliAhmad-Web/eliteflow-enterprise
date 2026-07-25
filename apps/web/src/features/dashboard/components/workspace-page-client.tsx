"use client";

import { UserRole } from "@enterprise/shared";

import { WorkspaceHome } from "@/features/dashboard/components/workspace-home";
import { RoleRouteGuard } from "@/features/rbac/components/role-route-guard";

export function WorkspacePageClient() {
  return (
    <RoleRouteGuard allowedRoles={[UserRole.EMPLOYEE]}>
      <WorkspaceHome />
    </RoleRouteGuard>
  );
}
