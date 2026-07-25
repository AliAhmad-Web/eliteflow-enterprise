import { prisma, Prisma } from "@enterprise/database";

interface AiAuditInput {
  userId?: string | null;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAiAuditEvent(input: AiAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        resource: "ai",
        resourceId: input.resourceId ?? null,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("[ai] Failed to write audit log:", error);
  }
}

export const AI_AUDIT_ACTIONS = {
  CHAT: "ai.chat",
  CONVERSATION_DELETE: "ai.conversation.delete",
  DOCUMENT_CREATE: "ai.document.create",
  DOCUMENT_UPDATE: "ai.document.update",
  DOCUMENT_DELETE: "ai.document.delete",
} as const;
