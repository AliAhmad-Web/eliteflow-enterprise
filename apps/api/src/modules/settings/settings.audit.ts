import { prisma, Prisma } from "@enterprise/database";

import type { SettingsRequestContext } from "./settings.types.js";
import {
  SETTINGS_AUDIT_ACTIONS,
  SETTINGS_AUDIT_RESOURCE,
} from "./settings.constants.js";

export async function logSettingsAuditEvent(input: {
  userId?: string;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  context: SettingsRequestContext;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      resource: SETTINGS_AUDIT_RESOURCE,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata
        ? (input.metadata as Prisma.InputJsonValue)
        : undefined,
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
    },
  });
}

export { SETTINGS_AUDIT_ACTIONS };
