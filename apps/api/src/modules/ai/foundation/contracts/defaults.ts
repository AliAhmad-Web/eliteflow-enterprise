/**
 * Empty / default contract factories — structural helpers only, no I/O or policy logic.
 */

import type { AiActiveContext } from "./ai-active-context.js";
import type { AiEffectivePolicy } from "./ai-effective-policy.js";

export function emptyAiActiveContext(): AiActiveContext {
  return {
    module: null,
    surface: "UNKNOWN",
    conversationId: null,
    mode: null,
    user: null,
    organization: null,
    primaryEntity: null,
    entities: [],
    snippets: [],
    ambientText: null,
  };
}

/**
 * Neutral policy placeholders. Settings Enforcer replaces these at runtime.
 */
export function placeholderAiEffectivePolicy(): AiEffectivePolicy {
  return {
    historyEnabled: true,
    privacyMode: false,
    maxTokens: null,
    temperature: null,
    preferredProvider: null,
    preferredModel: null,
  };
}
