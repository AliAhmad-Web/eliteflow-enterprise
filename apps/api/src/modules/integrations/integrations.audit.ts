import type { IntegrationsRequestContext } from "./integrations.types.js";
import {
  INTEGRATIONS_AUDIT_ACTIONS,
  INTEGRATIONS_AUDIT_RESOURCE,
} from "./integrations.constants.js";
import { writeAuditLog } from "../../shared/security/write-audit-log.js";

export async function logIntegrationsAuditEvent(input: {
  userId?: string;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  context: IntegrationsRequestContext;
}): Promise<void> {
  await writeAuditLog({
    userId: input.userId ?? null,
    action: input.action,
    resource: INTEGRATIONS_AUDIT_RESOURCE,
    resourceId: input.resourceId ?? null,
    metadata: input.metadata,
    ipAddress: input.context.ipAddress,
    userAgent: input.context.userAgent,
  });
}

export { INTEGRATIONS_AUDIT_ACTIONS };
