import type {
  AiDocsFeatureFlagId,
  AiDocsFeatureFlags,
} from "./ai-docs-feature-flag.types";
import { parseEnvFlag } from "./parse-env-flag";

/**
 * Centralized AI Documents feature flags (Task 1.2).
 *
 * Uses Next.js NEXT_PUBLIC_AI_DOCS_* env vars with static access.
 * Defaults are always OFF — existing /ai-documents behavior unchanged.
 *
 * Rollback: set the corresponding NEXT_PUBLIC_AI_DOCS_* var to false/unset
 * and restart the web app.
 */

export function isAiDocsEnterpriseShellEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_DOCS_ENTERPRISE_SHELL, false);
}

export function isAiDocsSkeletonsEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_DOCS_SKELETONS, false);
}

export function isAiDocsEnhancedFeedbackEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_DOCS_ENHANCED_FEEDBACK, false);
}

export function isAiDocsLivePreviewEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_DOCS_LIVE_PREVIEW, false);
}

export function isAiDocsAutosaveEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_DOCS_AUTOSAVE, false);
}

export function isAiDocsTemplatePresetsEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_DOCS_TEMPLATE_PRESETS, false);
}

export function isAiDocsDeepLinkFetchEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_DOCS_DEEP_LINK_FETCH, false);
}

export function isAiDocsExportEnhancedEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_DOCS_EXPORT_ENHANCED, false);
}

export function isAiDocsCreateManualEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_DOCS_CREATE_MANUAL, false);
}

export function isAiDocsVersionHistoryEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_DOCS_VERSION_HISTORY, false);
}

export function isAiDocsSharingEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_DOCS_SHARING, false);
}

export function isAiDocsDraftsApprovalEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_DOCS_DRAFTS_APPROVAL, false);
}

export function isAiDocsCommentsEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_DOCS_COMMENTS, false);
}

export function isAiDocsRegenerateEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_DOCS_REGENERATE, false);
}

export function isAiDocsFeatureEnabled(flag: AiDocsFeatureFlagId): boolean {
  switch (flag) {
    case "AI_DOCS_ENTERPRISE_SHELL":
      return isAiDocsEnterpriseShellEnabled();
    case "AI_DOCS_SKELETONS":
      return isAiDocsSkeletonsEnabled();
    case "AI_DOCS_ENHANCED_FEEDBACK":
      return isAiDocsEnhancedFeedbackEnabled();
    case "AI_DOCS_LIVE_PREVIEW":
      return isAiDocsLivePreviewEnabled();
    case "AI_DOCS_AUTOSAVE":
      return isAiDocsAutosaveEnabled();
    case "AI_DOCS_TEMPLATE_PRESETS":
      return isAiDocsTemplatePresetsEnabled();
    case "AI_DOCS_DEEP_LINK_FETCH":
      return isAiDocsDeepLinkFetchEnabled();
    case "AI_DOCS_EXPORT_ENHANCED":
      return isAiDocsExportEnhancedEnabled();
    case "AI_DOCS_CREATE_MANUAL":
      return isAiDocsCreateManualEnabled();
    case "AI_DOCS_VERSION_HISTORY":
      return isAiDocsVersionHistoryEnabled();
    case "AI_DOCS_SHARING":
      return isAiDocsSharingEnabled();
    case "AI_DOCS_DRAFTS_APPROVAL":
      return isAiDocsDraftsApprovalEnabled();
    case "AI_DOCS_COMMENTS":
      return isAiDocsCommentsEnabled();
    case "AI_DOCS_REGENERATE":
      return isAiDocsRegenerateEnabled();
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}

export function getAiDocsFeatureFlags(): AiDocsFeatureFlags {
  return {
    AI_DOCS_ENTERPRISE_SHELL: isAiDocsEnterpriseShellEnabled(),
    AI_DOCS_SKELETONS: isAiDocsSkeletonsEnabled(),
    AI_DOCS_ENHANCED_FEEDBACK: isAiDocsEnhancedFeedbackEnabled(),
    AI_DOCS_LIVE_PREVIEW: isAiDocsLivePreviewEnabled(),
    AI_DOCS_AUTOSAVE: isAiDocsAutosaveEnabled(),
    AI_DOCS_TEMPLATE_PRESETS: isAiDocsTemplatePresetsEnabled(),
    AI_DOCS_DEEP_LINK_FETCH: isAiDocsDeepLinkFetchEnabled(),
    AI_DOCS_EXPORT_ENHANCED: isAiDocsExportEnhancedEnabled(),
    AI_DOCS_CREATE_MANUAL: isAiDocsCreateManualEnabled(),
    AI_DOCS_VERSION_HISTORY: isAiDocsVersionHistoryEnabled(),
    AI_DOCS_SHARING: isAiDocsSharingEnabled(),
    AI_DOCS_DRAFTS_APPROVAL: isAiDocsDraftsApprovalEnabled(),
    AI_DOCS_COMMENTS: isAiDocsCommentsEnabled(),
    AI_DOCS_REGENERATE: isAiDocsRegenerateEnabled(),
  };
}
