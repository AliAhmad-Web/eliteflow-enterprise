import type { Metadata } from "next";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AuthGuard } from "@/features/auth/components/auth-guard";
import { RoutePermissionGuard } from "@/features/rbac/components/route-permission-guard";
import { isSeoRobotsEnabled } from "@/features/seo/feature-flags";
import { composePrivateSurfaceMetadata } from "@/features/seo/metadata/compose-public-page-metadata";

const DASHBOARD_BASELINE: Metadata = {};

export const metadata: Metadata = composePrivateSurfaceMetadata(
  DASHBOARD_BASELINE,
  isSeoRobotsEnabled(),
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <RoutePermissionGuard>
        <DashboardShell>{children}</DashboardShell>
      </RoutePermissionGuard>
    </AuthGuard>
  );
}
