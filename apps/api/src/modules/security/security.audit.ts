import type { SecurityRequestContext } from "./security.types.js";
import {
  SECURITY_AUDIT_ACTIONS,
  SECURITY_AUDIT_RESOURCE,
} from "./security.constants.js";
import {
  writeAuditLog,
  writeAuditLogSafe,
} from "../../shared/security/write-audit-log.js";

interface AuditInput {
  userId?: string;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  context: SecurityRequestContext;
}

export async function logSecurityAuditEvent(input: AuditInput): Promise<void> {
  await writeAuditLog({
    userId: input.userId ?? null,
    action: input.action,
    resource: SECURITY_AUDIT_RESOURCE,
    resourceId: input.resourceId ?? null,
    metadata: input.metadata,
    ipAddress: input.context.ipAddress,
    userAgent: input.context.userAgent,
  });
}

/**
 * Best-effort security audit for read/telemetry paths.
 * Never fails the request when the integrity chain is contended.
 */
export async function logSecurityAuditEventSafe(
  input: AuditInput,
): Promise<void> {
  await writeAuditLogSafe(
    {
      userId: input.userId ?? null,
      action: input.action,
      resource: SECURITY_AUDIT_RESOURCE,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata,
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
    },
    "security-audit",
  );
}

export { SECURITY_AUDIT_ACTIONS };
