import {
  REDACTED,
  sanitizeForLogging,
  scrubSensitiveString,
} from "@enterprise/shared";
import type { Breadcrumb, ErrorEvent, NodeOptions } from "@sentry/node";

const SENSITIVE_HEADER_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-csrf-token",
  "x-api-key",
]);

function parseTracesSampleRate(): number {
  const raw = process.env.SENTRY_TRACES_SAMPLE_RATE?.trim();
  if (raw) {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      return parsed;
    }
  }

  return process.env.NODE_ENV === "production" ? 0.1 : 1;
}

export function getApiSentryEnvironment(): string {
  return (
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    process.env.VERCEL_ENV?.trim() ||
    process.env.NODE_ENV ||
    "development"
  );
}

export function getApiSentryDsn(): string | undefined {
  return process.env.SENTRY_DSN?.trim() || undefined;
}

export function isApiSentryEnabled(): boolean {
  if (!getApiSentryDsn()) {
    return false;
  }

  const enabledFlag = process.env.SENTRY_ENABLED?.trim().toLowerCase();
  return enabledFlag !== "false" && enabledFlag !== "0" && enabledFlag !== "off";
}

export function getApiSentryRelease(): string | undefined {
  return (
    process.env.SENTRY_RELEASE?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.VERCEL_DEPLOYMENT_ID?.trim() ||
    undefined
  );
}

export function isApiSentryProbeEnabled(): boolean {
  const flag = process.env.SENTRY_PROBE_ENABLED?.trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "on";
}

function scrubHeaders(headers: Record<string, string> | undefined): void {
  if (!headers) return;

  for (const key of Object.keys(headers)) {
    if (SENSITIVE_HEADER_KEYS.has(key.toLowerCase())) {
      headers[key] = REDACTED;
    }
  }
}

function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const next: Breadcrumb = { ...breadcrumb };

  if (typeof next.message === "string") {
    next.message = scrubSensitiveString(next.message);
  }

  if (next.data) {
    next.data = sanitizeForLogging(next.data);
  }

  return next;
}

export function scrubApiSentryEvent(event: ErrorEvent): ErrorEvent | null {
  const next: ErrorEvent = { ...event };

  if (next.request?.headers) {
    scrubHeaders(next.request.headers as Record<string, string>);
  }

  if (next.request?.data) {
    next.request = {
      ...next.request,
      data: sanitizeForLogging(next.request.data),
    };
  }

  if (next.extra) {
    next.extra = sanitizeForLogging(next.extra);
  }

  if (next.contexts) {
    next.contexts = sanitizeForLogging(next.contexts);
  }

  if (next.breadcrumbs) {
    next.breadcrumbs = next.breadcrumbs.map(scrubBreadcrumb);
  }

  if (next.user) {
    next.user = next.user.id ? { id: next.user.id } : undefined;
  }

  return next;
}

export function buildApiSentryOptions(): NodeOptions {
  const dsn = getApiSentryDsn();

  return {
    dsn,
    enabled: isApiSentryEnabled(),
    environment: getApiSentryEnvironment(),
    release: getApiSentryRelease(),
    tracesSampleRate: parseTracesSampleRate(),
    sendDefaultPii: false,
    dataCollection: {
      userInfo: false,
      httpBodies: [],
    },
    beforeSend: scrubApiSentryEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  };
}
