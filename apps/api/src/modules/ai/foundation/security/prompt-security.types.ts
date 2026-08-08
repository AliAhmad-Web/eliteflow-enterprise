/**
 * Prompt security types (Phase 2 Step 4).
 */

export type PromptThreatCategory =
  | "PROMPT_INJECTION"
  | "SYSTEM_PROMPT_ATTACK"
  | "SECRET_EXTRACTION"
  | "MEMORY_POISONING"
  | "DOCUMENT_INJECTION"
  | "TOOL_INJECTION"
  | "OUTPUT_SECRET_LEAK"
  | "ROLE_OVERRIDE"
  | "POLICY_BYPASS";

export type PromptSecurityAction = "allow" | "sanitize" | "block";

export interface PromptThreatMatch {
  readonly category: PromptThreatCategory;
  readonly patternId: string;
  /** Sanitized evidence — never the full raw malicious prompt. */
  readonly evidence: string;
  readonly weight: number;
}

export interface PromptScanResult {
  readonly score: number;
  readonly action: PromptSecurityAction;
  readonly matches: readonly PromptThreatMatch[];
  readonly sanitizedText: string;
  readonly blocked: boolean;
}

export interface PromptOutputScanResult {
  readonly leaked: boolean;
  readonly redactedText: string;
  readonly matches: readonly PromptThreatMatch[];
}

export interface PromptSecurityContext {
  readonly userId?: string | null;
  readonly conversationId?: string | null;
  readonly surface?: string | null;
  readonly toolId?: string | null;
}
