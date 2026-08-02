import type {
  AiUiFeatureFlagId,
  AiUiFeatureFlags,
} from "./ai-ui-feature-flag.types";
import { parseEnvFlag } from "./parse-env-flag";

/**
 * Centralized AI Assistant UI feature flags (Wave W0).
 *
 * Uses Next.js NEXT_PUBLIC_* env vars with static access so values are
 * inlined at build time. Defaults are always OFF — existing UI unchanged.
 *
 * Rollback: set the corresponding NEXT_PUBLIC_AI_UI_* var to false/unset
 * and restart the web app.
 */

export function isAiUiEnterpriseShellEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_UI_ENTERPRISE_SHELL, false);
}

export function isAiUiStreamControlsEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_UI_STREAM_CONTROLS, false);
}

export function isAiUiEnhancedFeedbackEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_UI_ENHANCED_FEEDBACK, false);
}

export function isAiUiSkeletonsEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_UI_SKELETONS, false);
}

export function isAiUiShortcutsEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_UI_SHORTCUTS, false);
}

export function isAiUiProviderBadgeEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_UI_PROVIDER_BADGE, false);
}

export function isAiUiContextIndicatorsEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_UI_CONTEXT_INDICATORS, false);
}

export function isAiUiMobileHistorySheetEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_AI_UI_MOBILE_HISTORY_SHEET,
    false,
  );
}

export function isAiUiHistoryPaginationEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_UI_HISTORY_PAGINATION, false);
}

export function isAiUiConversationOrgEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_AI_UI_CONVERSATION_ORG, false);
}

/**
 * Resolve a single flag by id. Prefer the dedicated `isAiUi*Enabled`
 * helpers for tree-shaking when only one flag is needed.
 */
export function isAiUiFeatureEnabled(flag: AiUiFeatureFlagId): boolean {
  switch (flag) {
    case "AI_UI_ENTERPRISE_SHELL":
      return isAiUiEnterpriseShellEnabled();
    case "AI_UI_STREAM_CONTROLS":
      return isAiUiStreamControlsEnabled();
    case "AI_UI_ENHANCED_FEEDBACK":
      return isAiUiEnhancedFeedbackEnabled();
    case "AI_UI_SKELETONS":
      return isAiUiSkeletonsEnabled();
    case "AI_UI_SHORTCUTS":
      return isAiUiShortcutsEnabled();
    case "AI_UI_PROVIDER_BADGE":
      return isAiUiProviderBadgeEnabled();
    case "AI_UI_CONTEXT_INDICATORS":
      return isAiUiContextIndicatorsEnabled();
    case "AI_UI_MOBILE_HISTORY_SHEET":
      return isAiUiMobileHistorySheetEnabled();
    case "AI_UI_HISTORY_PAGINATION":
      return isAiUiHistoryPaginationEnabled();
    case "AI_UI_CONVERSATION_ORG":
      return isAiUiConversationOrgEnabled();
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}

/** Full snapshot of all AI Assistant UI flags (all default OFF). */
export function getAiUiFeatureFlags(): AiUiFeatureFlags {
  return {
    AI_UI_ENTERPRISE_SHELL: isAiUiEnterpriseShellEnabled(),
    AI_UI_STREAM_CONTROLS: isAiUiStreamControlsEnabled(),
    AI_UI_ENHANCED_FEEDBACK: isAiUiEnhancedFeedbackEnabled(),
    AI_UI_SKELETONS: isAiUiSkeletonsEnabled(),
    AI_UI_SHORTCUTS: isAiUiShortcutsEnabled(),
    AI_UI_PROVIDER_BADGE: isAiUiProviderBadgeEnabled(),
    AI_UI_CONTEXT_INDICATORS: isAiUiContextIndicatorsEnabled(),
    AI_UI_MOBILE_HISTORY_SHEET: isAiUiMobileHistorySheetEnabled(),
    AI_UI_HISTORY_PAGINATION: isAiUiHistoryPaginationEnabled(),
    AI_UI_CONVERSATION_ORG: isAiUiConversationOrgEnabled(),
  };
}
