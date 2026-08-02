/**
 * AI Assistant UI feature flag identifiers (Wave W0).
 * Env vars use the NEXT_PUBLIC_AI_UI_* prefix; defaults are always OFF.
 */
export const AI_UI_FEATURE_FLAG_IDS = [
  "AI_UI_ENTERPRISE_SHELL",
  "AI_UI_STREAM_CONTROLS",
  "AI_UI_ENHANCED_FEEDBACK",
  "AI_UI_SKELETONS",
  "AI_UI_SHORTCUTS",
  "AI_UI_PROVIDER_BADGE",
  "AI_UI_CONTEXT_INDICATORS",
  "AI_UI_MOBILE_HISTORY_SHEET",
  "AI_UI_HISTORY_PAGINATION",
  "AI_UI_CONVERSATION_ORG",
] as const;

export type AiUiFeatureFlagId = (typeof AI_UI_FEATURE_FLAG_IDS)[number];

/** Snapshot of all AI Assistant UI flags (all default false). */
export type AiUiFeatureFlags = Readonly<Record<AiUiFeatureFlagId, boolean>>;
