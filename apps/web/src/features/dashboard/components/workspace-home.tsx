"use client";

import { EmployeeDashboard } from "@/features/dashboard/components/employee-dashboard";

/**
 * Employee home. Role access is enforced by RoleRouteGuard on the page.
 */
export function WorkspaceHome() {
  return <EmployeeDashboard />;
}
