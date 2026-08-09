"use client";

import { FolderKanban, FileText, Building2, CircleDollarSign } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { KpiStatsGrid } from "@/features/dashboard/components/kpi-stat-card";
import { RecentInvoicesCard } from "@/features/dashboard/components/recent-invoices-card";
import { RecentProjectsCard } from "@/features/dashboard/components/recent-projects-card";
import { RoleDashboardHeader } from "@/features/dashboard/components/role-dashboard-header";
import type {
  KpiStat,
  ProjectStatus,
  RecentInvoice,
  RecentProject,
  InvoiceStatus,
} from "@/features/dashboard/types/dashboard.types";
import { useInvoiceStats, useInvoices } from "@/features/invoices/hooks/use-invoices";
import { useProjectStats, useProjects } from "@/features/projects/hooks/use-projects";
import { staggerContainer } from "@/lib/motion";

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
        subtitle="Your personal account is ready. Business data unlocks after your company is connected."
      />

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="icon-box icon-box-md rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <Building2 strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">
                Connect your business account
              </CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                EliteFlow has not linked this login to a Client company yet.
                Projects, invoices, files, and calendar items stay hidden until
                an administrator connects your account — we never show sample
                or placeholder business data.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Contact your EliteFlow administrator to request linking.</li>
            <li>
              Use the same email as your company contact when possible so
              linking is faster and safer.
            </li>
            <li>
              After linking, this portal will load your real company-scoped
              projects and invoices automatically.
            </li>
          </ul>
          <div className="flex flex-wrap gap-2">
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
  const projectStatsQuery = useProjectStats();
  const invoiceStatsQuery = useInvoiceStats();

  const isLoading =
    projectsQuery.isLoading ||
    invoicesQuery.isLoading ||
    projectStatsQuery.isLoading ||
    invoiceStatsQuery.isLoading;

  const isError =
    projectsQuery.isError ||
    invoicesQuery.isError ||
    projectStatsQuery.isError ||
    invoiceStatsQuery.isError;

  const refetchAll = () => {
    void projectsQuery.refetch();
    void invoicesQuery.refetch();
    void projectStatsQuery.refetch();
    void invoiceStatsQuery.refetch();
  };

  const projectStats = projectStatsQuery.data;
  const invoiceStats = invoiceStatsQuery.data;

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
      id: "invoices",
      label: "Invoices",
      value: String(invoiceStats?.total ?? 0),
      change: 0,
      trend: "neutral",
      icon: FileText,
    },
    {
      id: "outstanding",
      label: "Outstanding",
      value: formatMoney(invoiceStats?.outstandingAmount ?? 0),
      change: 0,
      trend: "neutral",
      icon: CircleDollarSign,
      iconClassName: "bg-chart-2/15 text-chart-2 ring-chart-2/20",
    },
  ];

  const recentProjects: RecentProject[] = (projectsQuery.data?.items ?? []).map(
    (project) => ({
      id: project.id,
      name: project.name,
      company: project.clientName ?? companyName ?? "Your company",
      status: mapProjectStatus(project.status),
      date: project.dueDate
        ? new Date(project.dueDate).toLocaleDateString()
        : new Date(project.updatedAt).toLocaleDateString(),
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
      client: invoice.clientName ?? companyName ?? "Your company",
      amount: invoice.total,
      status: mapInvoiceStatus(invoice.status),
    }),
  );

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
            ? `Live view for ${companyName} — projects and billing scoped to your company.`
            : "Follow your projects, invoices, and shared updates from the EliteFlow team."
        }
      />

      {isLoading ? (
        <LoadingState
          label="Loading your company data"
          className="min-h-[240px]"
        />
      ) : null}

      {isError ? (
        <ErrorState
          title="Could not load portal data"
          description="Please retry. Your company link is active; this was a temporary load error."
          onRetry={refetchAll}
          className="min-h-[200px]"
        />
      ) : null}

      {!isLoading && !isError ? (
        <>
          <KpiStatsGrid stats={kpiStats} />

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

          {recentProjects.length === 0 && recentInvoices.length === 0 ? (
            <EmptyState
              title="No projects or invoices yet"
              description="When EliteFlow assigns work or sends invoices to your company, they will appear here."
              className="min-h-[160px]"
            />
          ) : null}
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
