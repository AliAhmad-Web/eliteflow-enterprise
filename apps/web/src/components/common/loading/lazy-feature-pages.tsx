"use client";

import dynamic from "next/dynamic";

import { FeatureErrorBoundary } from "@/components/common/feedback/feature-error-boundary";

/**
 * Route-level code splitting for App Router `page.tsx` shells.
 * Keep-alive loaders share the same feature modules (webpack dedupes chunks).
 * Never show a blocking spinner during chunk load — shell stays visible.
 */

export const LazyDashboardPage = dynamic(
  () =>
    import("@/features/dashboard/components/dashboard-page-client").then(
      (m) => m.DashboardPageClient,
    ),
  { loading: () => null },
);

export const LazyWorkspacePage = dynamic(
  () =>
    import("@/features/dashboard/components/workspace-page-client").then(
      (m) => m.WorkspacePageClient,
    ),
  { loading: () => null },
);

export const LazyAdminPage = dynamic(
  () =>
    import("@/features/dashboard/components/admin-page-client").then(
      (m) => m.AdminPageClient,
    ),
  {
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading admin console…
      </div>
    ),
  },
);

export const LazyPortalPage = dynamic(
  () =>
    import("@/features/dashboard/components/portal-page-client").then(
      (m) => m.PortalPageClient,
    ),
  { loading: () => null },
);

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

export const LazyRequestsPage = dynamic(
  () =>
    import(
      "@/features/customer-requests/components/requests-page-content"
    ).then((m) => m.RequestsPageContent),
  { loading: () => null },
);

export const LazyRequestNewPage = dynamic(
  () =>
    import(
      "@/features/customer-requests/components/request-new-page-content"
    ).then((m) => m.RequestNewPageContent),
  { loading: () => null },
);

export const LazyRequestDetailsPage = dynamic(
  () =>
    import(
      "@/features/customer-requests/components/request-details-page-content"
    ).then((m) => m.RequestDetailsPageContent),
  { loading: () => null },
);

export const LazyStaffRequestsPage = dynamic(
  () =>
    import(
      "@/features/customer-requests/components/staff-requests-page-content"
    ).then((m) => m.StaffRequestsPageContent),
  { loading: () => null },
);

export const LazyStaffRequestDetailsPage = dynamic(
  () =>
    import(
      "@/features/customer-requests/components/staff-request-details-page-content"
    ).then((m) => m.StaffRequestDetailsPageContent),
  { loading: () => null },
);

export const LazyInvoicesPage = dynamic(
  () =>
    import("@/features/invoices/components/invoices-page-content").then(
      (m) => m.InvoicesPageContent,
    ),
  { loading: () => null },
);

export const LazyQuotesPage = dynamic(
  () =>
    import("@/features/quotes/components/quotes-page-content").then(
      (m) => m.QuotesPageContent,
    ),
  { loading: () => null },
);

export const LazyQuoteDetailsPage = dynamic(
  () =>
    import("@/features/quotes/components/quote-details-page-content").then(
      (m) => m.QuoteDetailsPageContent,
    ),
  { loading: () => null },
);

export const LazyQuoteFormPage = dynamic(
  () =>
    import("@/features/quotes/components/quote-form-page-content").then(
      (m) => m.QuoteFormPageContent,
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

export const LazyWhiteboardPage = dynamic(
  () =>
    import("@/features/whiteboard/components/whiteboard-page-content").then(
      (m) => m.WhiteboardPageContent,
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

export const LazyAiDocumentsPage = dynamic(
  () =>
    import("@/features/ai/components/ai-documents-page-content").then(
      (m) => m.AiDocumentsPageContent,
    ),
  { loading: () => null },
);

export const LazyMessagesPage = dynamic(
  () =>
    import("@/features/communication/components/messages-page-content").then(
      (m) => m.MessagesPageContent,
    ),
  { loading: () => null },
);

export const LazyChannelsPage = dynamic(
  () =>
    import("@/features/communication/components/channels-page-content").then(
      (m) => m.ChannelsPageContent,
    ),
  { loading: () => null },
);

export const LazyAnnouncementsPage = dynamic(
  () =>
    import(
      "@/features/communication/components/announcements-page-content"
    ).then((m) => m.AnnouncementsPageContent),
  { loading: () => null },
);

export const LazyThreadsPage = dynamic(
  () =>
    import("@/features/communication/components/threads-page-content").then(
      (m) => m.ThreadsPageContent,
    ),
  { loading: () => null },
);

export const LazyMeetingsPage = dynamic(
  () =>
    import("@/features/communication/components/meetings-page-content").then(
      (m) => m.MeetingsPageContent,
    ),
  { loading: () => null },
);

export const LazyActivityPage = dynamic(
  () =>
    import(
      "@/features/communication/components/activity-feed-page-content"
    ).then((m) => m.ActivityFeedPageContent),
  { loading: () => null },
);

export const LazyVoiceAiPage = dynamic(
  () =>
    import("@/features/communication/components/voice-ai-page-content").then(
      (m) => m.VoiceAiPageContent,
    ),
  { loading: () => null },
);

export const LazyWhatsappPage = dynamic(
  () =>
    import("@/features/communication/components/whatsapp-page-content").then(
      (m) => m.WhatsappPageContent,
    ),
  { loading: () => null },
);

export const LazyEmailAutomationPage = dynamic(
  () =>
    import(
      "@/features/communication/components/email-automation-workspace"
    ).then((m) => m.EmailAutomationPageContent),
  { loading: () => null },
);

export const LazyNotificationsPage = dynamic(
  () =>
    import(
      "@/features/notifications/components/notifications-page-content"
    ).then((m) => m.NotificationsPageContent),
  { loading: () => null },
);

export const LazyIntegrationsPage = dynamic(
  () =>
    import(
      "@/features/integrations/components/integrations-center-page-content"
    ).then((m) => m.IntegrationsCenterPageContent),
  { loading: () => null },
);

export const LazySettingsPage = dynamic(
  () =>
    import("@/features/settings/components/settings-center-page-content").then(
      (m) => m.SettingsCenterPageContent,
    ),
  { loading: () => null },
);

export const LazyProfilePage = dynamic(
  () =>
    import("@/features/profile/components/profile-page-content").then(
      (m) => m.ProfilePageContent,
    ),
  { loading: () => null },
);

export const LazySecurityPage = dynamic(
  () =>
    import("@/features/security/components/security-center-page-content").then(
      (m) => m.SecurityCenterPageContent,
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
