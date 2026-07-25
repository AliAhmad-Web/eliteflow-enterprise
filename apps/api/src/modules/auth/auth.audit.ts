import { prisma, Prisma } from "@enterprise/database";

import type { RequestContext } from "./auth.types.js";
import { AUTH_AUDIT_ACTIONS, AUTH_AUDIT_RESOURCE } from "./auth.constants.js";

interface AuditEventInput {
  userId?: string;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  context: RequestContext;
}

export async function logAuthAuditEvent(input: AuditEventInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      resource: AUTH_AUDIT_RESOURCE,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata
        ? (input.metadata as Prisma.InputJsonValue)
        : undefined,
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
    },
  });
}

interface LoginAttemptInput {
  email: string;
  userId?: string;
  success: boolean;
  failureReason?: string;
  context: RequestContext;
}

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

export { AUTH_AUDIT_ACTIONS };
