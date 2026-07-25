"use client";

import { AdminDashboard } from "@/features/dashboard/components/admin-dashboard";

/**
 * Operations home for Admin and Super Admin.
 * Role access is enforced by RoleRouteGuard on the page.
 */
export function DashboardContent() {
  return <AdminDashboard />;
}
