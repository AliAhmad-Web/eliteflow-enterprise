/**
 * Runtime AI policy derived from user settings (Settings Enforcer / Policy Stage).
 * Application to providers/memory is handled by later milestones.
 */
export interface AiEffectivePolicy {
  readonly historyEnabled: boolean;
  readonly privacyMode: boolean;
  readonly maxTokens: number | null;
  readonly temperature: number | null;
  /** Preferred provider id when set (e.g. gemini, openai). */
  readonly preferredProvider: string | null;
  /** Preferred model override when set. */
  readonly preferredModel: string | null;
}
