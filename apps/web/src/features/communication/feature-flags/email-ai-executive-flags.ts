/**
 * Executive Assistant Email AI enhancements — independently toggleable (default OFF).
 * Turning any flag OFF restores prior behavior without code removal or API changes.
 * Env: NEXT_PUBLIC_EMAIL_AI_*
 */

import { parseEnvFlag } from "@/features/ai/feature-flags";

const OFF = false;

export function isEmailAiContactResolutionEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_EMAIL_AI_CONTACT_RESOLUTION,
    OFF,
  );
}

export function isEmailAiSmartPreviewEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_EMAIL_AI_SMART_PREVIEW, OFF);
}

export function isEmailAiSmartValidationEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_EMAIL_AI_SMART_VALIDATION, OFF);
}

export function isEmailAiRewriteEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_EMAIL_AI_REWRITE, OFF);
}

export function isEmailAiScheduleEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_EMAIL_AI_SCHEDULE, OFF);
}

export function isEmailAiInsightsEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_EMAIL_AI_INSIGHTS, OFF);
}

export function isEmailAiThreadsEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_EMAIL_AI_THREADS, OFF);
}

export function isEmailAiSearchEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_EMAIL_AI_SEARCH, OFF);
}

export function isEmailAiVoiceEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_EMAIL_AI_VOICE, OFF);
}

export function isEmailAiGroupsEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_EMAIL_AI_GROUPS, OFF);
}

export function isEmailAiExecutiveUiEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_EMAIL_AI_EXECUTIVE_UI, OFF);
}

export function isEmailAiCommandPaletteEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_EMAIL_AI_COMMAND_PALETTE, OFF);
}

/** Any executive EMAIL_AI_* enhancement is active. */
export function isEmailAiExecutiveAnyEnabled(): boolean {
  return (
    isEmailAiContactResolutionEnabled() ||
    isEmailAiSmartPreviewEnabled() ||
    isEmailAiSmartValidationEnabled() ||
    isEmailAiRewriteEnabled() ||
    isEmailAiScheduleEnabled() ||
    isEmailAiInsightsEnabled() ||
    isEmailAiThreadsEnabled() ||
    isEmailAiSearchEnabled() ||
    isEmailAiVoiceEnabled() ||
    isEmailAiGroupsEnabled() ||
    isEmailAiExecutiveUiEnabled() ||
    isEmailAiCommandPaletteEnabled()
  );
}

export type EmailAiExecutiveFlags = {
  contactResolution: boolean;
  smartPreview: boolean;
  smartValidation: boolean;
  rewrite: boolean;
  schedule: boolean;
  insights: boolean;
  threads: boolean;
  search: boolean;
  voice: boolean;
  groups: boolean;
  executiveUi: boolean;
  commandPalette: boolean;
};

export function getEmailAiExecutiveFlags(): EmailAiExecutiveFlags {
  return {
    contactResolution: isEmailAiContactResolutionEnabled(),
    smartPreview: isEmailAiSmartPreviewEnabled(),
    smartValidation: isEmailAiSmartValidationEnabled(),
    rewrite: isEmailAiRewriteEnabled(),
    schedule: isEmailAiScheduleEnabled(),
    insights: isEmailAiInsightsEnabled(),
    threads: isEmailAiThreadsEnabled(),
    search: isEmailAiSearchEnabled(),
    voice: isEmailAiVoiceEnabled(),
    groups: isEmailAiGroupsEnabled(),
    executiveUi: isEmailAiExecutiveUiEnabled(),
    commandPalette: isEmailAiCommandPaletteEnabled(),
  };
}
