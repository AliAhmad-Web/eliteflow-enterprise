import type { SettingsRequestContext } from "./settings.types.js";
import {
  SETTINGS_AUDIT_ACTIONS,
  SETTINGS_AUDIT_RESOURCE,
} from "./settings.constants.js";
import { writeAuditLog } from "../../shared/security/write-audit-log.js";

export async function logSettingsAuditEvent(input: {
  userId?: string;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  context: SettingsRequestContext;
}): Promise<void> {
  await writeAuditLog({
    userId: input.userId ?? null,
    action: input.action,
    resource: SETTINGS_AUDIT_RESOURCE,
    resourceId: input.resourceId ?? null,
    metadata: input.metadata,
    ipAddress: input.context.ipAddress,
    userAgent: input.context.userAgent,
  });
}

export { SETTINGS_AUDIT_ACTIONS };
