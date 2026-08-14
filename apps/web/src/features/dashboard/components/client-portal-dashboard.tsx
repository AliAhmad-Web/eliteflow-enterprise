"use client";

import {
  AlertTriangle,
  CheckSquare,
  CircleDollarSign,
  ClipboardList,
  FileText,
  FolderKanban,
  Inbox,
  Receipt,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { PERMISSIONS } from "@enterprise/shared";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { KpiStatsGrid } from "@/features/dashboard/components/kpi-stat-card";
import { RecentInvoicesCard } from "@/features/dashboard/components/recent-invoices-card";
import { RecentProjectsCard } from "@/features/dashboard/components/recent-projects-card";
import { RoleDashboardHeader } from "@/features/dashboard/components/role-dashboard-header";
import type {
  InvoiceStatus,
  KpiStat,
  ProjectStatus,
  RecentInvoice,
  RecentProject,
} from "@/features/dashboard/types/dashboard.types";
import { useInvoiceStats, useInvoices } from "@/features/invoices/hooks/use-invoices";
import {
  useNotifications,
} from "@/features/notifications/hooks/use-notifications";
import {
  CATEGORY_LABELS,
  formatRelativeTime,
} from "@/features/notifications/types/notifications.types";
import { useProjectStats, useProjects } from "@/features/projects/hooks/use-projects";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";
import { useTaskStats, useTasks } from "@/features/tasks/hooks/use-tasks";
import { staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

function mapProjectStatus(status: string): ProjectStatus {
  switch (status) {
    case "IN_PROGRESS":
      return "in_progress";
    case "COMPLETED":
      return "completed";
    case "ON_HOLD":
    case "CANCELLED":
      return "on_hold";
    default:
      return "not_started";
  }
}

function mapInvoiceStatus(status: string): InvoiceStatus {
  switch (status) {
    case "PAID":
      return "paid";
    case "OVERDUE":
      return "overdue";
    default:
      return "pending";
  }
}

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTaskDeadline(dueDate: string | null): string {
  if (!dueDate) return "No deadline";
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return "No deadline";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  const label = due.toLocaleDateString();
  if (diffDays < 0) return `Overdue · ${label}`;
  if (diffDays === 0) return `Due today · ${label}`;
  if (diffDays === 1) return `Due tomorrow · ${label}`;
  return `Due ${label}`;
}

function taskTone(status: string, dueDate: string | null): string {
  if (status === "COMPLETED") return "border-border/40";
  if (!dueDate) return "border-border/40";
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return "border-border/40";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  if (dueDay.getTime() < today.getTime()) {
    return "border-destructive/30 bg-destructive/5";
  }
  if (dueDay.getTime() === today.getTime()) {
    return "border-warning/30 bg-warning/5";
  }
  return "border-border/40";
}

function ClientRequestIntakeCard() {
  return (
    <Card className="border-border/50 shadow-(--shadow-sm)">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="icon-box icon-box-md rounded-xl bg-primary/10 ring-1 ring-primary/15">
            <Inbox strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold tracking-tight">
              Welcome to EliteFlow
            </CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              What would you like us to help you with?
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`${ROUTES.REQUESTS_NEW}?type=NEW_PROJECT`}>
              Start a New Project
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`${ROUTES.REQUESTS_NEW}?type=NEW_TASK`}>
              Request a Task / Service
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={ROUTES.REQUESTS}>View My Requests</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={ROUTES.PROJECTS}>Open a project to request a change</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={ROUTES.MESSAGES}>Contact EliteFlow</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ClientUnlinkedOnboarding({ firstName }: { firstName: string }) {
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
        subtitle="Submit a project request to get started. Your dashboard unlocks after EliteFlow approves and accepts your request."
      />

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="icon-box icon-box-md rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <ClipboardList strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">
                Start with a project request
              </CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Submit your project request. After clarification and approval,
                your workspace unlocks automatically — projects, invoices,
                tasks, and files become visible for your account.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              You can create and track your own requests immediately — no
              existing company account is required.
            </li>
            <li>
              After EliteFlow approves your request, your customer account is
              activated automatically. No extra company selection is required.
            </li>
            <li>
              Until then, you only see your own requests — never another
              company&apos;s business data.
            </li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={ROUTES.REQUESTS_NEW}>New request</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={ROUTES.REQUESTS}>My requests</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={ROUTES.SETTINGS}>Open profile settings</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ClientLinkedDashboard({
  firstName,
  companyName,
}: {
  firstName: string;
  companyName: string | null;
}) {
  const canReadNotifications = useHasPermission(PERMISSIONS.NOTIFICATIONS_READ);

  const projectsQuery = useProjects({
    search: "",
    sortBy: "updatedAt",
    sortOrder: "desc",
    page: 1,
    limit: 5,
  });
  const invoicesQuery = useInvoices({
    search: "",
    sortBy: "issueDate",
    sortOrder: "desc",
    page: 1,
    limit: 5,
  });
  const tasksQuery = useTasks({
    search: "",
    sortBy: "dueDate",
    sortOrder: "asc",
    page: 1,
    limit: 8,
  });
  const projectStatsQuery = useProjectStats();
  const invoiceStatsQuery = useInvoiceStats();
  const taskStatsQuery = useTaskStats();
  const activityQuery = useNotifications(
    { page: 1, pageSize: 8, isArchived: "false" },
    canReadNotifications,
  );

  const isLoading =
    projectsQuery.isLoading ||
    invoicesQuery.isLoading ||
    tasksQuery.isLoading ||
    projectStatsQuery.isLoading ||
    invoiceStatsQuery.isLoading ||
    taskStatsQuery.isLoading ||
    (canReadNotifications && activityQuery.isLoading);

  const isError =
    projectsQuery.isError ||
    invoicesQuery.isError ||
    tasksQuery.isError ||
    projectStatsQuery.isError ||
    invoiceStatsQuery.isError ||
    taskStatsQuery.isError ||
    (canReadNotifications && activityQuery.isError);

  const refetchAll = () => {
    void projectsQuery.refetch();
    void invoicesQuery.refetch();
    void tasksQuery.refetch();
    void projectStatsQuery.refetch();
    void invoiceStatsQuery.refetch();
    void taskStatsQuery.refetch();
    if (canReadNotifications) void activityQuery.refetch();
  };

  const projectStats = projectStatsQuery.data;
  const invoiceStats = invoiceStatsQuery.data;
  const taskStats = taskStatsQuery.data;
  const openTasks =
    (taskStats?.todo ?? 0) +
    (taskStats?.inProgress ?? 0) +
    (taskStats?.review ?? 0) +
    (taskStats?.blocked ?? 0);

  const kpiStats: KpiStat[] = [
    {
      id: "projects",
      label: "Your projects",
      value: String(projectStats?.total ?? 0),
      change: 0,
      trend: "neutral",
      icon: FolderKanban,
    },
    {
      id: "active",
      label: "In progress",
      value: String(projectStats?.inProgress ?? 0),
      change: 0,
      trend: "neutral",
      icon: FolderKanban,
      iconClassName: "bg-chart-1/15 text-chart-1 ring-chart-1/20",
    },
    {
      id: "completed",
      label: "Completed projects",
      value: String(projectStats?.completed ?? 0),
      change: 0,
      trend: "neutral",
      icon: CheckSquare,
      iconClassName: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
    },
    {
      id: "open-tasks",
      label: "Open tasks",
      value: String(openTasks),
      change: 0,
      trend: "neutral",
      icon: ClipboardList,
      iconClassName: "bg-chart-3/15 text-chart-3 ring-chart-3/20",
    },
    {
      id: "overdue-tasks",
      label: "Overdue tasks",
      value: String(taskStats?.overdue ?? 0),
      change: 0,
      trend: "neutral",
      icon: AlertTriangle,
      iconClassName: "bg-destructive/10 text-destructive ring-destructive/20",
    },
    {
      id: "invoices",
      label: "Invoices",
      value: String(invoiceStats?.total ?? 0),
      change: 0,
      trend: "neutral",
      icon: FileText,
    },
    {
      id: "paid",
      label: "Paid",
      value: formatMoney(invoiceStats?.paidAmount ?? 0),
      change: 0,
      trend: "neutral",
      icon: CircleDollarSign,
      iconClassName: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
    },
    {
      id: "outstanding",
      label: "Outstanding",
      value: formatMoney(invoiceStats?.outstandingAmount ?? 0),
      change: 0,
      trend: "neutral",
      icon: Receipt,
      iconClassName: "bg-chart-2/15 text-chart-2 ring-chart-2/20",
    },
    {
      id: "overdue-invoices",
      label: "Overdue invoices",
      value: String(invoiceStats?.overdue ?? 0),
      change: 0,
      trend: "neutral",
      icon: AlertTriangle,
      iconClassName: "bg-warning/15 text-warning ring-warning/20",
    },
  ];

  const recentProjects: RecentProject[] = (projectsQuery.data?.items ?? []).map(
    (project) => ({
      id: project.id,
      name: project.name,
      company: project.clientName ?? companyName ?? "Your company",
      status: mapProjectStatus(project.status),
      date: project.dueDate
        ? `Due ${new Date(project.dueDate).toLocaleDateString()}`
        : `Updated ${new Date(project.updatedAt).toLocaleDateString()}`,
      progress: project.progress,
      team: (project.members ?? []).slice(0, 4).map((member) => {
        const initials =
          `${member.firstName?.[0] ?? ""}${member.lastName?.[0] ?? ""}`.toUpperCase() ||
          "?";
        return initials;
      }),
    }),
  );

  const recentInvoices: RecentInvoice[] = (invoicesQuery.data?.items ?? []).map(
    (invoice) => ({
      id: invoice.id,
      number: invoice.invoiceNumber,
      client: invoice.clientName ?? companyName ?? "Your company",
      amount: invoice.total,
      status: mapInvoiceStatus(invoice.status),
    }),
  );

  const tasks = tasksQuery.data?.items ?? [];
  const activityItems = canReadNotifications
    ? (activityQuery.data?.items ?? [])
    : [];

  const hasAnyBusinessData =
    recentProjects.length > 0 ||
    recentInvoices.length > 0 ||
    tasks.length > 0 ||
    activityItems.length > 0;

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
        subtitle={
          companyName
            ? `Live view for ${companyName} — projects, billing, tasks, and updates scoped to your company.`
            : "Follow your projects, invoices, tasks, and shared updates from the EliteFlow team."
        }
      />

      {isLoading ? (
        <LoadingState
          label="Loading your company data"
          className="min-h-60"
        />
      ) : null}

      {isError ? (
        <ErrorState
          title="Could not load portal data"
          description="Please retry. Your company link is active; this was a temporary load error."
          onRetry={refetchAll}
          className="min-h-50"
        />
      ) : null}

      {!isLoading && !isError ? (
        <>
          <ClientRequestIntakeCard />

          {hasAnyBusinessData ? <KpiStatsGrid stats={kpiStats} /> : null}

          {hasAnyBusinessData ? (
            <>
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                <RecentProjectsCard
                  projects={recentProjects}
                  title="Your projects"
                  viewAllHref={ROUTES.PROJECTS}
                />
                <RecentInvoicesCard
                  invoices={recentInvoices}
                  title="Billing"
                  viewAllHref={ROUTES.INVOICES}
                />
              </div>

              <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                <Card className="border-border/50 shadow-(--shadow-sm)">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-base font-semibold tracking-tight">
                      Tasks & deadlines
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs text-primary"
                      asChild
                    >
                      <Link href={ROUTES.TASKS}>View all</Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {tasks.length === 0 ? (
                      <EmptyState
                        title="No tasks yet"
                        description="Tasks on your company projects will appear here with deadlines."
                        actionLabel="Open tasks"
                        actionHref={ROUTES.TASKS}
                        className="min-h-40 border-0 bg-transparent"
                      />
                    ) : (
                      <ul className="space-y-2" aria-label="Company tasks">
                        {tasks.map((task) => (
                          <li
                            key={task.id}
                            className={cn(
                              "rounded-xl border p-3 transition-colors hover:bg-accent/40",
                              taskTone(task.status, task.dueDate),
                            )}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {task.title}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {task.projectName ?? "Project"} ·{" "}
                                  {formatTaskDeadline(task.dueDate)}
                                </p>
                              </div>
                              <Badge variant="outline" className="shrink-0">
                                {task.status.replaceAll("_", " ")}
                              </Badge>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50 shadow-(--shadow-sm)">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-base font-semibold tracking-tight">
                      Recent updates
                    </CardTitle>
                    {canReadNotifications ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs text-primary"
                        asChild
                      >
                        <Link href={ROUTES.NOTIFICATIONS}>View all</Link>
                      </Button>
                    ) : null}
                  </CardHeader>
                  <CardContent>
                    {!canReadNotifications ? (
                      <EmptyState
                        title="Updates unavailable"
                        description="Your role does not include notification access."
                        className="min-h-40 border-0 bg-transparent"
                      />
                    ) : activityItems.length === 0 ? (
                      <EmptyState
                        title="No recent updates"
                        description="Project and billing notifications for your account will show here."
                        actionLabel="Open notifications"
                        actionHref={ROUTES.NOTIFICATIONS}
                        className="min-h-40 border-0 bg-transparent"
                      />
                    ) : (
                      <ul className="space-y-2" aria-label="Recent updates">
                        {activityItems.map((item) => (
                          <li
                            key={item.id}
                            className="rounded-xl border border-border/40 p-3 transition-colors hover:bg-accent/40"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {item.title}
                                </p>
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {item.body}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {CATEGORY_LABELS[item.category] ??
                                    item.category}{" "}
                                  · {formatRelativeTime(item.createdAt)}
                                </p>
                              </div>
                              {!item.isRead ? (
                                <Badge variant="info" className="shrink-0">
                                  New
                                </Badge>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="No company data yet"
              description="When EliteFlow assigns projects, tasks, or invoices to your company, they will appear here. Meanwhile, start a request above."
              className="min-h-40"
            />
          )}
        </>
      ) : null}
    </motion.div>
  );
}

export function ClientPortalDashboard() {
  const { user } = useAuth();
  const firstName = user?.firstName ?? "there";
  const isLinked = Boolean(user?.companyId);

  if (!isLinked) {
    return <ClientUnlinkedOnboarding firstName={firstName} />;
  }

  return (
    <ClientLinkedDashboard
      firstName={firstName}
      companyName={user?.companyName ?? null}
    />
  );
}
