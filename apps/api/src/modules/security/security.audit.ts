import { prisma, Prisma } from "@enterprise/database";

import type { SecurityRequestContext } from "./security.types.js";
import {
  SECURITY_AUDIT_ACTIONS,
  SECURITY_AUDIT_RESOURCE,
} from "./security.constants.js";

interface AuditInput {
  userId?: string;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  context: SecurityRequestContext;
}

export async function logSecurityAuditEvent(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      resource: SECURITY_AUDIT_RESOURCE,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata
        ? (input.metadata as Prisma.InputJsonValue)
        : undefined,
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
    },
  });
}

export { SECURITY_AUDIT_ACTIONS };
