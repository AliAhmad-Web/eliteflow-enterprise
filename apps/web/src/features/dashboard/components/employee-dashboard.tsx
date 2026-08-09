"use client";

import { motion } from "framer-motion";

import { CalendarWidget } from "@/features/dashboard/components/calendar-widget";
import { KpiStatsGrid } from "@/features/dashboard/components/kpi-stat-card";
import { RecentProjectsCard } from "@/features/dashboard/components/recent-projects-card";
import { RoleDashboardHeader } from "@/features/dashboard/components/role-dashboard-header";
import { TodaysTasksWidget } from "@/features/dashboard/components/todays-tasks-widget";
import {
  EMPLOYEE_ACTIONS,
  EMPLOYEE_KPI_STATS,
  EMPLOYEE_PROJECTS,
} from "@/features/dashboard/data/role-dashboards.dummy";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { staggerContainer } from "@/lib/motion";

export function EmployeeDashboard() {
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
        badge="Employee"
        title={`My workspace, ${firstName}`}
        subtitle="Focus on assigned tasks, project delivery, and today's schedule."
        actions={EMPLOYEE_ACTIONS}
      />

      <KpiStatsGrid stats={EMPLOYEE_KPI_STATS} />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <TodaysTasksWidget
          title="Assigned to me today"
          className="lg:col-span-2"
        />
        <CalendarWidget />
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <RecentProjectsCard
          projects={EMPLOYEE_PROJECTS}
          title="My projects"
        />
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Today&apos;s focus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Use Today&apos;s Tasks and Calendar for live assignments and meetings.
              Open Tasks or Calendar for full detail.
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>Checkboxes sync task status to the Tasks module</li>
              <li>Calendar days open real events</li>
              <li>Shortcuts respect your role permissions</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
