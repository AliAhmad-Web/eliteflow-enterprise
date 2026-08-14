import type { ComponentType } from "react";
import { createElement } from "react";

import { ROUTES } from "@/constants/routes";

export type KeepAlivePageModule = { default: ComponentType };

export type KeepAliveLoader = () => Promise<KeepAlivePageModule>;

/**
 * Static dashboard routes kept alive across navigations (Notion-style).
 */
export const KEEP_ALIVE_LOADERS: Record<string, KeepAliveLoader> = {
  [ROUTES.DASHBOARD]: () =>
    import("@/features/dashboard/components/dashboard-page-client").then(
      (m) => ({ default: m.DashboardPageClient }),
    ),
  [ROUTES.WORKSPACE]: () =>
    import("@/features/dashboard/components/workspace-page-client").then(
      (m) => ({ default: m.WorkspacePageClient }),
    ),
  [ROUTES.ADMIN]: () =>
    import("@/features/dashboard/components/admin-page-client").then((m) => ({
      default: m.AdminPageClient,
    })),
  [ROUTES.PORTAL]: () =>
    import("@/features/dashboard/components/portal-page-client").then((m) => ({
      default: m.PortalPageClient,
    })),
  [ROUTES.CLIENTS]: () =>
    import("@/features/clients/components/clients-page-content").then((m) => ({
      default: m.ClientsPageContent,
    })),
  [ROUTES.PROJECTS]: () =>
    import("@/features/projects/components/projects-page-content").then(
      (m) => ({ default: m.ProjectsPageContent }),
    ),
  [ROUTES.TASKS]: () =>
    import("@/features/tasks/components/tasks-page-content").then((m) => ({
      default: m.TasksPageContent,
    })),
  [ROUTES.INVOICES]: () =>
    import("@/features/invoices/components/invoices-page-content").then(
      (m) => ({ default: m.InvoicesPageContent }),
    ),
  [ROUTES.QUOTES]: () =>
    import("@/features/quotes/components/quotes-page-content").then((m) => ({
      default: m.QuotesPageContent,
    })),
  [ROUTES.PAYMENTS]: () =>
    import("@/features/payments/components/payments-page-content").then(
      (m) => ({ default: m.PaymentsPageContent }),
    ),
  [ROUTES.REPORTS]: () =>
    import("@/features/reports/components/reports-page-content").then((m) => ({
      default: m.ReportsPageContent,
    })),
  [ROUTES.CALENDAR]: () =>
    import("@/features/calendar/components/calendar-page-content").then(
      (m) => ({ default: m.CalendarPageContent }),
    ),
  [ROUTES.WHITEBOARD]: () =>
    import("@/features/whiteboard/components/whiteboard-page-content").then(
      (m) => ({ default: m.WhiteboardPageContent }),
    ),
  [ROUTES.MESSAGES]: () =>
    import("@/features/communication/components/messages-page-content").then(
      (m) => ({ default: m.MessagesPageContent }),
    ),
  [ROUTES.CHANNELS]: () =>
    import("@/features/communication/components/channels-page-content").then(
      (m) => ({ default: m.ChannelsPageContent }),
    ),
  [ROUTES.ANNOUNCEMENTS]: () =>
    import(
      "@/features/communication/components/announcements-page-content"
    ).then((m) => ({ default: m.AnnouncementsPageContent })),
  [ROUTES.THREADS]: () =>
    import("@/features/communication/components/threads-page-content").then(
      (m) => ({ default: m.ThreadsPageContent }),
    ),
  [ROUTES.MEETINGS]: () =>
    import("@/features/communication/components/meetings-page-content").then(
      (m) => ({ default: m.MeetingsPageContent }),
    ),
  [ROUTES.ACTIVITY]: () =>
    import(
      "@/features/communication/components/activity-feed-page-content"
    ).then((m) => ({ default: m.ActivityFeedPageContent })),
  [ROUTES.VOICE_AI]: () =>
    import("@/features/communication/components/voice-ai-page-content").then(
      (m) => ({ default: m.VoiceAiPageContent }),
    ),
  [ROUTES.WHATSAPP]: () =>
    import("@/features/communication/components/whatsapp-page-content").then(
      (m) => ({ default: m.WhatsappPageContent }),
    ),
  [ROUTES.EMAIL_AUTOMATION]: () =>
    import(
      "@/features/communication/components/email-automation-workspace"
    ).then((m) => ({ default: m.EmailAutomationPageContent })),
  [ROUTES.TEAM]: () =>
    import("@/features/team/components/team-page-content").then((m) => ({
      default: m.TeamPageContent,
    })),
  [ROUTES.FILE_MANAGER]: () =>
    import("@/features/files/components/file-manager-page-content").then(
      (m) => ({ default: m.FileManagerPageContent }),
    ),
  [ROUTES.AI_ASSISTANT]: () =>
    import("@/features/ai/components/ai-assistant-page-content").then((m) => ({
      default: m.AiAssistantPageContent,
    })),
  [ROUTES.AI_DOCUMENTS]: () =>
    import("@/features/ai/components/ai-documents-page-content").then((m) => ({
      default: m.AiDocumentsPageContent,
    })),
  [ROUTES.NOTIFICATIONS]: () =>
    import(
      "@/features/notifications/components/notifications-page-content"
    ).then((m) => ({ default: m.NotificationsPageContent })),
  [ROUTES.INTEGRATIONS]: () =>
    import(
      "@/features/integrations/components/integrations-center-page-content"
    ).then((m) => ({ default: m.IntegrationsCenterPageContent })),
  [ROUTES.SETTINGS]: () =>
    import("@/features/settings/components/settings-center-page-content").then(
      (m) => ({ default: m.SettingsCenterPageContent }),
    ),
  [ROUTES.SECURITY]: () =>
    import("@/features/security/components/security-center-page-content").then(
      (m) => ({ default: m.SecurityCenterPageContent }),
    ),
};

/**
 * RC#10: dynamic pathnames kept alive by full path (e.g. /channels/:id).
 * Each distinct URL gets its own cache slot; React Query still shares data.
 */
type DynamicKeepAlivePattern = {
  test: RegExp;
  load: (pathname: string, match: RegExpExecArray) => Promise<KeepAlivePageModule>;
};

const KEEP_ALIVE_DYNAMIC_PATTERNS: DynamicKeepAlivePattern[] = [
  {
    test: /^\/channels\/([^/]+)$/,
    load: async (_pathname, match) => {
      const channelId = match[1]!;
      const mod = await import(
        "@/features/communication/components/channel-chat-page-content"
      );
      function ChannelChatKeepAlivePage() {
        return createElement(mod.ChannelChatPageContent, { channelId });
      }
      return { default: ChannelChatKeepAlivePage };
    },
  },
  {
    test: /^\/notifications\/([^/]+)$/,
    load: async (_pathname, match) => {
      const id = match[1]!;
      const mod = await import(
        "@/features/notifications/components/notification-permalink-content"
      );
      function NotificationKeepAlivePage() {
        return createElement(mod.NotificationPermalinkContent, {
          params: Promise.resolve({ id }),
        });
      }
      return { default: NotificationKeepAlivePage };
    },
  },
  {
    test: /^\/files\/([^/]+)$/,
    load: async () => {
      const mod = await import(
        "@/features/files/components/file-viewer/file-viewer-page-content"
      );
      return { default: mod.FileViewerPageContent };
    },
  },
];

export const KEEP_ALIVE_ROUTES = Object.keys(KEEP_ALIVE_LOADERS);

export function matchKeepAliveRoute(pathname: string): string | null {
  if (KEEP_ALIVE_LOADERS[pathname]) {
    return pathname;
  }
  for (const pattern of KEEP_ALIVE_DYNAMIC_PATTERNS) {
    if (pattern.test.test(pathname)) {
      return pathname;
    }
  }
  return null;
}

function resolveLoader(route: string): KeepAliveLoader | null {
  const staticLoader = KEEP_ALIVE_LOADERS[route];
  if (staticLoader) {
    return staticLoader;
  }
  for (const pattern of KEEP_ALIVE_DYNAMIC_PATTERNS) {
    const match = pattern.test.exec(route);
    if (match) {
      return () => pattern.load(route, match);
    }
  }
  return null;
}

const preloaded = new Map<string, Promise<ComponentType | null>>();

export function preloadKeepAliveRoute(
  pathname: string,
): Promise<ComponentType | null> {
  const route = matchKeepAliveRoute(pathname);
  if (!route) {
    return Promise.resolve(null);
  }

  const existing = preloaded.get(route);
  if (existing) {
    return existing;
  }

  const loader = resolveLoader(route);
  if (!loader) {
    return Promise.resolve(null);
  }

  // Swallow ChunkLoadError (common after HMR / server restart) and allow retry.
  const promise = loader()
    .then((mod) => mod.default)
    .catch(() => {
      preloaded.delete(route);
      return null;
    });
  preloaded.set(route, promise);
  return promise;
}

/** @deprecated Prefer targeted preload — full stampede hurts FCP/refresh. */
export function preloadAllKeepAliveRoutes(): Promise<void> {
  return Promise.all(
    KEEP_ALIVE_ROUTES.map((route) => preloadKeepAliveRoute(route)),
  ).then(() => undefined);
}

/** Used by KeepAliveOutlet to resolve loaders for static + dynamic routes. */
export function getKeepAliveLoader(route: string): KeepAliveLoader | null {
  return resolveLoader(route);
}
