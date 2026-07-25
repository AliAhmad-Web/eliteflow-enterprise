"use client";

import dynamic from "next/dynamic";

import { FeatureErrorBoundary } from "@/components/common/feedback/feature-error-boundary";

/**
 * Route-level code splitting helpers. Keep-alive is preferred for dashboard routes;
 * these exist as fallbacks. Never show a blocking spinner during chunk load.
 */
export const LazyClientsPage = dynamic(
  () =>
    import("@/features/clients/components/clients-page-content").then(
      (m) => m.ClientsPageContent,
    ),
  { loading: () => null },
);

export const LazyProjectsPage = dynamic(
  () =>
    import("@/features/projects/components/projects-page-content").then(
      (m) => m.ProjectsPageContent,
    ),
  { loading: () => null },
);

export const LazyTasksPage = dynamic(
  () =>
    import("@/features/tasks/components/tasks-page-content").then(
      (m) => m.TasksPageContent,
    ),
  { loading: () => null },
);

export const LazyInvoicesPage = dynamic(
  () =>
    import("@/features/invoices/components/invoices-page-content").then(
      (m) => m.InvoicesPageContent,
    ),
  { loading: () => null },
);

export const LazyTeamPage = dynamic(
  () =>
    import("@/features/team/components/team-page-content").then(
      (m) => m.TeamPageContent,
    ),
  { loading: () => null, ssr: false },
);

export const LazyReportsPage = dynamic(
  () =>
    import("@/features/reports/components/reports-page-content").then(
      (m) => m.ReportsPageContent,
    ),
  { loading: () => null },
);

export const LazyCalendarPage = dynamic(
  () =>
    import("@/features/calendar/components/calendar-page-content").then(
      (m) => m.CalendarPageContent,
    ),
  { loading: () => null },
);

export const LazyFileManagerPage = dynamic(
  () =>
    import("@/features/files/components/file-manager-page-content").then(
      (m) => m.FileManagerPageContent,
    ),
  { loading: () => null },
);

export const LazyAiAssistantPage = dynamic(
  () =>
    import("@/features/ai/components/ai-assistant-page-content").then(
      (m) => m.AiAssistantPageContent,
    ),
  { loading: () => null },
);

/** Client wrapper so server route pages can compose error boundaries without calling client fns. */
export function FeaturePageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return <FeatureErrorBoundary title={title}>{children}</FeatureErrorBoundary>;
}
