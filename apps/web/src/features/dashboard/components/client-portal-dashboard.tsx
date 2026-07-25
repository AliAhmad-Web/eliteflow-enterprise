"use client";

import { motion } from "framer-motion";

import { KpiStatsGrid } from "@/features/dashboard/components/kpi-stat-card";
import { RecentInvoicesCard } from "@/features/dashboard/components/recent-invoices-card";
import { RecentProjectsCard } from "@/features/dashboard/components/recent-projects-card";
import { RoleDashboardHeader } from "@/features/dashboard/components/role-dashboard-header";
import {
  CLIENT_INVOICES,
  CLIENT_KPI_STATS,
  CLIENT_PROJECTS,
  CLIENT_UPDATES,
} from "@/features/dashboard/data/role-dashboards.dummy";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { staggerContainer } from "@/lib/motion";

export function ClientPortalDashboard() {
  const { user } = useAuth();
  const firstName = user?.firstName ?? "there";

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <RoleDashboardHeader
        badge="Client Portal"
        title={`Welcome, ${firstName}`}
        subtitle="Follow your projects, invoices, and shared updates from the EliteFlow team."
      />

      <KpiStatsGrid stats={CLIENT_KPI_STATS} />

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <RecentProjectsCard projects={CLIENT_PROJECTS} title="Your projects" />
        <RecentInvoicesCard invoices={CLIENT_INVOICES} title="Billing" />
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Recent updates</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3" aria-label="Recent updates">
            {CLIENT_UPDATES.map((update) => (
              <li
                key={update.id}
                className="rounded-lg border border-border/50 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {update.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {update.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {update.time}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}
