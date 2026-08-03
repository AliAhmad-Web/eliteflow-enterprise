import type { Request } from "express";

import { prisma, Prisma } from "@enterprise/database";

import { isApiSecurityMonitoringEnabled } from "../../config/security-flags.js";
import { AUTH_AUDIT_RESOURCE } from "../../modules/auth/auth.constants.js";

/**
 * Best-effort security monitoring writes (Phase 4 Phase 2).
 * Never throws into the request pipeline.
 */
export async function logSecurityRateLimited(input: {
  req: Request;
  scope: string;
  max: number;
  windowMs: number;
}): Promise<void> {
  if (!isApiSecurityMonitoringEnabled()) {
    return;
  }

  try {
    const ip =
      typeof input.req.headers["x-forwarded-for"] === "string"
        ? input.req.headers["x-forwarded-for"].split(",")[0]?.trim()
        : input.req.ip;

    await prisma.auditLog.create({
      data: {
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
        } as Prisma.InputJsonValue,
        ipAddress: ip ?? null,
        userAgent:
          typeof input.req.headers["user-agent"] === "string"
            ? input.req.headers["user-agent"]
            : null,
      },
    });
  } catch {
    // ignore audit failures
  }
}
