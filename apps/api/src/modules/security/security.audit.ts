import type { SecurityRequestContext } from "./security.types.js";
import {
  SECURITY_AUDIT_ACTIONS,
  SECURITY_AUDIT_RESOURCE,
} from "./security.constants.js";
import { writeAuditLog } from "../../shared/security/write-audit-log.js";

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

export { SECURITY_AUDIT_ACTIONS };
