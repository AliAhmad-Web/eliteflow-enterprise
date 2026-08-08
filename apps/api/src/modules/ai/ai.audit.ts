import { writeAuditLogSafe } from "../../shared/security/write-audit-log.js";

interface AiAuditInput {
  userId?: string | null;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAiAuditEvent(input: AiAuditInput): Promise<void> {
  await writeAuditLogSafe(
    {
      userId: input.userId ?? null,
      action: input.action,
      resource: "ai",
      resourceId: input.resourceId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
    "ai",
  );
}

export const AI_AUDIT_ACTIONS = {
  CHAT: "ai.chat",
  CONVERSATION_DELETE: "ai.conversation.delete",
  DOCUMENT_CREATE: "ai.document.create",
  DOCUMENT_UPDATE: "ai.document.update",
  DOCUMENT_DELETE: "ai.document.delete",
  RESTRICTED_DATA_BLOCKED: "AI_RESTRICTED_DATA_BLOCKED",
  POLICY_DENIED: "AI_POLICY_DENIED",
  BUDGET_BLOCKED: "ai.budget.blocked",
  BUDGET_USAGE: "ai.budget.usage_recorded",
} as const;
