/**
 * Lifecycle metadata for a single AI execution.
 * Immutable snapshot — no business data payloads.
 */

/** Caller surface within EliteFlow (extensible). */
export type AiFoundationSurface =
  | "ASSISTANT"
  | "DOCUMENTS"
  | "COMMUNICATION"
  | "WHITEBOARD"
  | "REPORTS"
  | "UNKNOWN";

export interface AiExecutionContext {
  readonly requestId: string;
  readonly userId: string;
  /** Reserved for future multi-tenant; EliteFlow is single-tenant today. */
  readonly organizationId?: string | null;
  readonly conversationId?: string | null;
  /** Resolved provider name at execution time (e.g. gemini, openai, mock). */
  readonly provider: string;
  /** Assist / document mode label (e.g. ASK, EMAIL, DOCUMENT). */
  readonly mode: string;
  readonly streaming: boolean;
  readonly timestamp: string;
  /** Optional surface tag for future stage routing. */
  readonly surface?: AiFoundationSurface;
}
