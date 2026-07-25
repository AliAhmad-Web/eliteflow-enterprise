import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AuthGuard } from "@/features/auth/components/auth-guard";
import { RoutePermissionGuard } from "@/features/rbac/components/route-permission-guard";

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
