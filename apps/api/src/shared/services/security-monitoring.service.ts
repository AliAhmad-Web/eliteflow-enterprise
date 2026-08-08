import type { Request } from "express";

import { isApiSecurityMonitoringEnabled } from "../../config/security-flags.js";
import { AUTH_AUDIT_RESOURCE } from "../../modules/auth/auth.constants.js";
import { writeAuditLogSafe } from "../security/write-audit-log.js";
import { securityMonitoringService } from "../security/monitoring/index.js";

export { securityMonitoringService } from "../security/monitoring/index.js";
export {
  THREAT_DETECTION_TYPES,
  THREAT_DETECTION_RULES,
} from "../security/monitoring/index.js";

/**
 * Best-effort rate-limit signal (BC wrapper).
 * Threat detection always (RATE_LIMIT_EXCEEDED + legacy abuse aggregation).
 * Audit only when monitoring flag ON — avoids excessive audit writes.
 */
export async function logSecurityRateLimited(input: {
  req: Request;
  scope: string;
  max: number;
  windowMs: number;
}): Promise<void> {
  const ip =
    typeof input.req.headers["x-forwarded-for"] === "string"
      ? input.req.headers["x-forwarded-for"].split(",")[0]?.trim()
      : input.req.ip;
  const userAgent =
    typeof input.req.headers["user-agent"] === "string"
      ? input.req.headers["user-agent"]
      : null;

  const threatInput = {
    userId: input.req.auth?.userId ?? null,
    resource: "api" as const,
    resourceId: input.scope,
    message: `Rate limit exceeded for scope ${input.scope}`,
    metadata: {
      scope: input.scope,
      max: input.max,
      windowMs: input.windowMs,
      method: input.req.method,
      path: input.req.originalUrl,
    },
    ipAddress: ip ?? null,
    userAgent,
  };

  void securityMonitoringService.reportRateLimitExceeded(threatInput);

  if (!isApiSecurityMonitoringEnabled()) {
    return;
  }

  await writeAuditLogSafe(
    {
      userId: input.req.auth?.userId ?? null,
      action: "security.rate_limited",
      resource: AUTH_AUDIT_RESOURCE,
      resourceId: input.req.originalUrl,
      metadata: {
        scope: input.scope,
        max: input.max,
        windowMs: input.windowMs,
        method: input.req.method,
        path: input.req.originalUrl,
        sessionId: input.req.auth?.sessionId ?? null,
      },
      ipAddress: ip ?? null,
      userAgent,
    },
    "security-monitoring",
  );
}
