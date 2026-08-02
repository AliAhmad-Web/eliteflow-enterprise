/**
 * Working memory session isolation metadata.
 */

export interface AiWorkingMemorySession {
  readonly sessionKey: string;
  readonly conversationId: string | null;
  readonly userId: string | null;
  readonly isolated: boolean;
}

export function buildWorkingMemorySession(input: {
  readonly userId?: string | null;
  readonly conversationId?: string | null;
  readonly sessionContextEnabled: boolean;
}): AiWorkingMemorySession {
  const userId = input.userId?.trim() || null;
  const conversationId = input.conversationId?.trim() || null;
  const sessionKey = input.sessionContextEnabled
    ? `${userId ?? "anon"}:${conversationId ?? "request"}`
    : "shared:request";

  return Object.freeze({
    sessionKey,
    conversationId,
    userId,
    isolated: input.sessionContextEnabled,
  });
}
