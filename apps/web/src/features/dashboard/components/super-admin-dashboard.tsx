"use client";

import { motion } from "framer-motion";

import { FocusListCard } from "@/features/dashboard/components/focus-list-card";
import { KpiStatsGrid } from "@/features/dashboard/components/kpi-stat-card";
import { RoleDashboardHeader } from "@/features/dashboard/components/role-dashboard-header";
import {
  SUPER_ADMIN_ACTIONS,
  SUPER_ADMIN_FOCUS,
  SUPER_ADMIN_KPI_STATS,
} from "@/features/dashboard/data/role-dashboards.dummy";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { staggerContainer } from "@/lib/motion";

const SYSTEM_HEALTH = [
  { id: "api", label: "API", status: "Operational" },
  { id: "auth", label: "Auth", status: "Operational" },
  { id: "db", label: "Database", status: "Operational" },
  { id: "email", label: "Email", status: "Degraded" },
] as const;

export function SuperAdminDashboard() {
  const { user } = useAuth();
  const firstName = user?.firstName ?? "Super Admin";

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <RoleDashboardHeader
        badge="Super Admin"
        title={`Platform control, ${firstName}`}
        subtitle="Monitor tenants, security posture, and system health across EliteFlow."
        actions={SUPER_ADMIN_ACTIONS}
      />

      <KpiStatsGrid stats={SUPER_ADMIN_KPI_STATS} />

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-3">
        <FocusListCard
          title="Priority actions"
          items={SUPER_ADMIN_FOCUS}
          className="xl:col-span-2"
        />
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">System health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {SYSTEM_HEALTH.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
              >
                <span className="text-sm text-foreground">{item.label}</span>
                <span
                  className={
                    item.status === "Operational"
                      ? "text-xs font-medium text-success"
                      : "text-xs font-medium text-warning"
                  }
                >
                  {item.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Access control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Manage roles, elevate admins, and revoke compromised sessions.</p>
            <ul className="list-inside list-disc space-y-1">
              <li>Role & permission matrix</li>
              <li>Forced logout / session revoke</li>
              <li>2FA policy enforcement</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Tenant oversight</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Review workspace usage, billing flags, and onboarding status.</p>
            <ul className="list-inside list-disc space-y-1">
              <li>18 active workspaces</li>
              <li>2 pending plan changes</li>
              <li>1 trial expiring this week</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
