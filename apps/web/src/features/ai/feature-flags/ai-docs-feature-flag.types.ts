/**
 * AI Documents feature flag identifiers (Task 1.2 Phase 1).
 * Env vars use the NEXT_PUBLIC_AI_DOCS_* prefix; defaults are always OFF.
 */
export const AI_DOCS_FEATURE_FLAG_IDS = [
  "AI_DOCS_ENTERPRISE_SHELL",
  "AI_DOCS_SKELETONS",
  "AI_DOCS_ENHANCED_FEEDBACK",
  "AI_DOCS_LIVE_PREVIEW",
  "AI_DOCS_AUTOSAVE",
  "AI_DOCS_TEMPLATE_PRESETS",
  "AI_DOCS_DEEP_LINK_FETCH",
  "AI_DOCS_EXPORT_ENHANCED",
  "AI_DOCS_CREATE_MANUAL",
  "AI_DOCS_VERSION_HISTORY",
  "AI_DOCS_SHARING",
  "AI_DOCS_DRAFTS_APPROVAL",
  "AI_DOCS_COMMENTS",
  "AI_DOCS_REGENERATE",
] as const;

export type AiDocsFeatureFlagId = (typeof AI_DOCS_FEATURE_FLAG_IDS)[number];

/** Snapshot of all AI Documents flags (all default false). */
export type AiDocsFeatureFlags = Readonly<
  Record<AiDocsFeatureFlagId, boolean>
>;
