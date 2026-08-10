import type { RequestContext } from "./auth.types.js";
import { AUTH_AUDIT_ACTIONS, AUTH_AUDIT_RESOURCE } from "./auth.constants.js";
import {
  writeAuditLogSafe,
} from "../../shared/security/write-audit-log.js";
import { maskEmail } from "@enterprise/shared";
import { prisma } from "@enterprise/database";

interface AuditEventInput {
  userId?: string;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  context: RequestContext;
}

function toAuditInput(input: AuditEventInput) {
  return {
    userId: input.userId ?? null,
    action: input.action,
    resource: AUTH_AUDIT_RESOURCE,
    resourceId: input.resourceId ?? null,
    metadata: input.metadata,
    ipAddress: input.context.ipAddress,
    userAgent: input.context.userAgent,
  };
}

export async function logAuthAuditEvent(input: AuditEventInput): Promise<void> {
  // Never fail auth because the integrity-chained audit writer is contended —
  // that previously surfaced as opaque OAuth 500s under Supabase pooler load.
  await writeAuditLogSafe(toAuditInput(input), "auth-audit");
}

/**
 * Fire-and-forget auth audit — never blocks token issuance (e.g. /auth/refresh).
 * Still writes the integrity-chained audit row via writeAuditLogSafe.
 */
export function scheduleAuthAuditEvent(input: AuditEventInput): void {
  void writeAuditLogSafe(toAuditInput(input), "auth-audit");
}

interface LoginAttemptInput {
  email: string;
  userId?: string;
  success: boolean;
  failureReason?: string;
  context: RequestContext;
}

/**
 * Login attempts retain email for lockout/security correlation.
 * Display layer must mask; do not put raw passwords here.
 */
export async function logLoginAttempt(input: LoginAttemptInput): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      email: input.email,
      userId: input.userId ?? null,
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
      success: input.success,
      failureReason: input.failureReason ?? null,
    },
  });
}

/** Helper for audit metadata that only needs a masked email reference. */
export function maskedEmailMeta(email: string): { email: string } {
  return { email: maskEmail(email) };
}

export { AUTH_AUDIT_ACTIONS };
