export const INTEGRATIONS_AUDIT_RESOURCE = "integrations" as const;

export const INTEGRATIONS_AUDIT_ACTIONS = {
  CONNECTED: "integrations.connected",
  DISCONNECTED: "integrations.disconnected",
  TESTED: "integrations.tested",
  VIEWED: "integrations.viewed",
  SEED_ENSURED: "integrations.catalog_ensured",
  OAUTH_STARTED: "integrations.oauth_started",
  TOKEN_REFRESHED: "integrations.token_refreshed",
  TOKEN_REFRESH_FAILED: "integrations.token_refresh_failed",
  SYNC_STARTED: "integrations.sync_started",
  SYNC_RETRY: "integrations.sync_retry",
  SYNC_CANCELLED: "integrations.sync_cancelled",
  SCHEDULER_UPDATED: "integrations.scheduler_updated",
  ALERT_ACKNOWLEDGED: "integrations.alert_acknowledged",
  ALERTS_EVALUATED: "integrations.alerts_evaluated",
} as const;

export const INTEGRATIONS_MESSAGES = {
  FORBIDDEN: "You do not have permission to manage integrations",
  VIEW_FORBIDDEN: "You do not have permission to view this integration",
  NOT_FOUND: "Integration not found",
  CONNECTED: "Integration connected successfully.",
  DISCONNECTED: "Integration disconnected successfully.",
  ALREADY_CONNECTED: "Integration is already connected",
  NOT_CONNECTED: "Integration is not connected",
  TEST_OK: "Integration health check passed.",
  TEST_FAIL: "Integration health check failed.",
  OAUTH_NOT_READY:
    "OAuth credentials are not configured for this provider — connect is blocked until provider OAuth is ready.",
  OAUTH_REDIRECT: "Redirect to the provider to complete OAuth.",
} as const;

export interface IntegrationCatalogItem {
  slug: string;
  name: string;
  description: string;
  provider:
    | "GOOGLE"
    | "GITHUB"
    | "OPENAI"
    | "GEMINI"
    | "STRIPE"
    | "CLOUDINARY"
    | "SUPABASE"
    | "RESEND"
    | "OTHER";
  category: string;
  logoKey: string;
  sortOrder: number;
  visibleToEmployee: boolean;
  visibleToClient: boolean;
  /**
   * Honest implementation maturity (P1-09).
   * REAL = connect + credential validation works for intended use.
   * PARTIAL = connect/credentials work; some product features deferred.
   * PLACEHOLDER = architecture / catalog only — never show as fully live.
   */
  implementationStatus: "REAL" | "PARTIAL" | "PLACEHOLDER";
}

/** Canonical Phase 19 catalog — seeded on first Integration Center access. */
export const INTEGRATION_CATALOG: readonly IntegrationCatalogItem[] = [
  {
    slug: "gmail",
    name: "Gmail",
    description:
      "Sync inbound and outbound email with Gmail for client communication.",
    provider: "GOOGLE",
    category: "communication",
    logoKey: "gmail",
    sortOrder: 10,
    visibleToEmployee: true,
    visibleToClient: false,
    implementationStatus: "PARTIAL",
  },
  {
    slug: "google_calendar",
    name: "Google Calendar",
    description:
      "Keep meetings and deadlines aligned with Google Calendar events.",
    provider: "GOOGLE",
    category: "productivity",
    logoKey: "google_calendar",
    sortOrder: 20,
    visibleToEmployee: true,
    visibleToClient: true,
    implementationStatus: "PARTIAL",
  },
  {
    slug: "github",
    name: "GitHub",
    description:
      "Link repositories, pull requests, and deployment activity to projects.",
    provider: "GITHUB",
    category: "devops",
    logoKey: "github",
    sortOrder: 30,
    visibleToEmployee: true,
    visibleToClient: false,
    implementationStatus: "PARTIAL",
  },
  {
    slug: "gemini",
    name: "Gemini AI",
    description:
      "Primary AI provider for Assistant, documents, emails, proposals, reports, meeting notes, and task summaries.",
    provider: "GEMINI",
    category: "ai",
    logoKey: "gemini",
    sortOrder: 35,
    visibleToEmployee: true,
    visibleToClient: false,
    implementationStatus: "REAL",
  },
  {
    slug: "openai",
    name: "OpenAI",
    description:
      "Future AI provider — switch from Settings when connected. Architecture ready.",
    provider: "OPENAI",
    category: "ai",
    logoKey: "openai",
    sortOrder: 40,
    visibleToEmployee: true,
    visibleToClient: false,
    implementationStatus: "PARTIAL",
  },
  {
    slug: "stripe",
    name: "Stripe",
    description:
      "Billing architecture for products, subscriptions, checkout, payment intents, portal, and webhooks (no live charges yet).",
    provider: "STRIPE",
    category: "payments",
    logoKey: "stripe",
    sortOrder: 50,
    visibleToEmployee: false,
    visibleToClient: false,
    implementationStatus: "PLACEHOLDER",
  },
  {
    slug: "cloudinary",
    name: "Cloudinary",
    description:
      "Media CDN for File Manager — images, video, folders, and secure URLs.",
    provider: "CLOUDINARY",
    category: "storage",
    logoKey: "cloudinary",
    sortOrder: 60,
    visibleToEmployee: true,
    visibleToClient: false,
    implementationStatus: "REAL",
  },
  {
    slug: "supabase",
    name: "Supabase",
    description:
      "Verify existing Auth, Database, Storage, and Realtime (no duplicate stack).",
    provider: "SUPABASE",
    category: "backend",
    logoKey: "supabase",
    sortOrder: 70,
    visibleToEmployee: false,
    visibleToClient: false,
    implementationStatus: "PARTIAL",
  },
  {
    slug: "resend",
    name: "Resend",
    description:
      "Transactional, OTP, invoice, notification, and AI-generated email delivery.",
    provider: "RESEND",
    category: "email",
    logoKey: "resend",
    sortOrder: 80,
    visibleToEmployee: false,
    visibleToClient: false,
    implementationStatus: "REAL",
  },
] as const;

export function getIntegrationImplementationStatus(
  slug: string,
): IntegrationCatalogItem["implementationStatus"] {
  const item = INTEGRATION_CATALOG.find((row) => row.slug === slug);
  return item?.implementationStatus ?? "PLACEHOLDER";
}
