import { prisma, Prisma } from "@enterprise/database";

import type { IntegrationsRequestContext } from "./integrations.types.js";
import {
  INTEGRATIONS_AUDIT_ACTIONS,
  INTEGRATIONS_AUDIT_RESOURCE,
} from "./integrations.constants.js";

export async function logIntegrationsAuditEvent(input: {
  userId?: string;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  context: IntegrationsRequestContext;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      resource: INTEGRATIONS_AUDIT_RESOURCE,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata
        ? (input.metadata as Prisma.InputJsonValue)
        : undefined,
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
    },
  });
}

export { INTEGRATIONS_AUDIT_ACTIONS };
