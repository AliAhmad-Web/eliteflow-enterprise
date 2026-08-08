import helmet from "helmet";
import type { RequestHandler } from "express";

import { logger } from "../logger.js";
import { securityMonitoringService } from "../monitoring/index.js";
import { writeAuditLogSafe } from "../write-audit-log.js";
import {
  buildCspDirectives,
  isSensitiveNoStorePath,
  PERMISSIONS_POLICY_DIRECTIVES,
  resolveSecurityHeadersConfig,
  toSecurityHeadersStartupSnapshot,
} from "./security-headers.config.js";
import type { SecurityHeadersConfig } from "./security-headers.types.js";

const STARTUP_AUDIT_ACTION = "SECURITY_HEADERS_DISABLED";
const STARTUP_AUDIT_RESOURCE = "security_headers";

function toKebabCase(feature: string): string {
  return feature.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/** Helmet 8 does not ship Permissions-Policy — set it explicitly. */
export function buildPermissionsPolicyHeader(): string {
  return Object.entries(PERMISSIONS_POLICY_DIRECTIVES)
    .map(([feature, allowlist]) => {
      const value = allowlist.length > 0 ? allowlist.join(" ") : "";
      return `${toKebabCase(feature)}=(${value})`;
    })
    .join(", ");
}

/**
 * Build Helmet options from resolved config. Single source of truth —
 * controllers must not set these headers manually.
 */
export function buildHelmetOptions(config: SecurityHeadersConfig) {
  return {
    // Remove X-Powered-By / Express fingerprinting.
    hidePoweredBy: true as const,

    contentSecurityPolicy: config.cspEnabled
      ? {
          useDefaults: false as const,
          directives: buildCspDirectives(config.isProduction),
        }
      : false,

    // HSTS — production only (config.hstsEnabled already gated).
    hsts: config.hstsEnabled
      ? {
          maxAge: 31_536_000,
          includeSubDomains: true,
          preload: true,
        }
      : false,

    frameguard: { action: "deny" as const },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" as const },

    crossOriginOpenerPolicy: { policy: "same-origin" as const },
    crossOriginResourcePolicy: {
      policy: config.crossOriginResourcePolicy,
    },
    // COEP require-corp is opt-in — incompatible with most SPA+API splits.
    crossOriginEmbedderPolicy: config.coepEnabled
      ? { policy: "require-corp" as const }
      : false,

    originAgentCluster: true,

    // Legacy XSS header is obsolete.
    xXssProtection: false,
  };
}

/**
 * Apply Cache-Control: no-store on sensitive API surfaces.
 * Skips when the client requests SSE so the AI stream controller owns Cache-Control.
 */
function applySensitiveCacheHeaders(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
): void {
  const path = String(req.originalUrl ?? req.url ?? req.path).split("?")[0] ?? "";
  if (!isSensitiveNoStorePath(path)) return;

  const accept = String(req.headers.accept ?? "");
  if (accept.includes("text/event-stream")) {
    return;
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

/**
 * Central security-headers middleware (Helmet + Permissions-Policy + cache).
 */
export function createSecurityHeadersMiddleware(
  config: SecurityHeadersConfig = resolveSecurityHeadersConfig(),
): RequestHandler {
  if (!config.enabled) {
    return (_req, _res, next) => next();
  }

  const helmetMiddleware = helmet(buildHelmetOptions(config));
  const permissionsPolicy = config.permissionsPolicyEnabled
    ? buildPermissionsPolicyHeader()
    : null;

  return (req, res, next) => {
    helmetMiddleware(req, res, (err?: unknown) => {
      if (err) {
        next(err);
        return;
      }
      if (permissionsPolicy) {
        res.setHeader("Permissions-Policy", permissionsPolicy);
      }
      applySensitiveCacheHeaders(req, res);
      next();
    });
  };
}

/**
 * Log resolved header configuration once at process start.
 * When production disables the master switch, audit + monitoring alert.
 */
export function reportSecurityHeadersStartup(
  config: SecurityHeadersConfig = resolveSecurityHeadersConfig(),
): void {
  const snapshot = toSecurityHeadersStartupSnapshot(config);
  logger.info(
    `[security-headers] startup config=${JSON.stringify(snapshot)}`,
  );

  if (!config.isProduction || config.enabled) return;

  void writeAuditLogSafe(
    {
      action: STARTUP_AUDIT_ACTION,
      resource: STARTUP_AUDIT_RESOURCE,
      metadata: {
        reason: "SECURITY_HEADERS_ENABLED=false in production",
        snapshot,
      },
    },
    "security-headers",
  );

  void securityMonitoringService.reportSecurityHeadersDisabled({
    resource: STARTUP_AUDIT_RESOURCE,
    message: "Production security headers are disabled",
    metadata: { snapshot },
  });
}

export { resolveSecurityHeadersConfig, toSecurityHeadersStartupSnapshot };
