"use client";

import { motion } from "framer-motion";

import { DashboardRightPanelContent } from "@/features/dashboard/components/dashboard-right-panel-content";
import { KpiStatsGrid } from "@/features/dashboard/components/kpi-stat-card";
import { ProjectStatusChart } from "@/features/dashboard/components/project-status-chart";
import { RecentInvoicesCard } from "@/features/dashboard/components/recent-invoices-card";
import { RecentProjectsCard } from "@/features/dashboard/components/recent-projects-card";
import { RevenueChartCard } from "@/features/dashboard/components/revenue-chart-card";
import { RoleDashboardHeader } from "@/features/dashboard/components/role-dashboard-header";
import {
  ADMIN_ACTIONS,
  ADMIN_KPI_STATS,
  ADMIN_PROJECT_STATUS,
  ADMIN_RECENT_INVOICES,
  ADMIN_RECENT_PROJECTS,
  ADMIN_REVENUE_DATA,
} from "@/features/dashboard/data/role-dashboards.dummy";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { staggerContainer } from "@/lib/motion";

export function AdminDashboard() {
  const { user } = useAuth();
  const firstName = user?.firstName ?? "Admin";

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <RoleDashboardHeader
        badge="Admin"
        title={`Operations overview, ${firstName}`}
        subtitle="Track revenue, clients, delivery, and billing for your organization."
        actions={ADMIN_ACTIONS}
      />

      <KpiStatsGrid stats={ADMIN_KPI_STATS} />

      <div className="grid gap-4 sm:gap-6 min-[2560px]:gap-8 xl:grid-cols-3">
        <RevenueChartCard
          data={ADMIN_REVENUE_DATA}
          className="chart-responsive xl:col-span-2"
        />
        <ProjectStatusChart
          segments={ADMIN_PROJECT_STATUS}
          className="chart-responsive"
        />
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <RecentProjectsCard projects={ADMIN_RECENT_PROJECTS} />
        <RecentInvoicesCard invoices={ADMIN_RECENT_INVOICES} />
      </div>

      <div className="xl:hidden">
        <DashboardRightPanelContent />
      </div>
    </motion.div>
  );
}
