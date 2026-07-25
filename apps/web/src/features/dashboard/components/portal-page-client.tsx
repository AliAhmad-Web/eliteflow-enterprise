"use client";

import { PORTAL_ROLES } from "@enterprise/shared";

import { PortalHomeContent } from "@/features/dashboard/components/portal-home-content";
import { RoleRouteGuard } from "@/features/rbac/components/role-route-guard";

export function PortalPageClient() {
  return (
    <RoleRouteGuard allowedRoles={PORTAL_ROLES}>
      <PortalHomeContent />
    </RoleRouteGuard>
  );
}
