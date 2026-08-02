import { prisma } from "@enterprise/database";

import type { AiEffectivePolicy } from "../contracts/ai-effective-policy.js";
import { placeholderAiEffectivePolicy } from "../contracts/defaults.js";

/**
 * Future-ready per-request policy overrides (optional).
 * Only fields present are applied; unset fields fall through to user/system.
 */
export type AiPolicyOverrides = Partial<{
  historyEnabled: boolean;
  privacyMode: boolean;
  maxTokens: number | null;
  temperature: number | null;
  preferredProvider: string | null;
  preferredModel: string | null;
}>;

export interface ResolveAiEffectivePolicyInput {
  readonly userId?: string | null;
  readonly overrides?: AiPolicyOverrides | null;
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Read-only load of AI preference columns. Never creates or updates rows.
 */
async function readUserAiPreferences(userId: string): Promise<{
  aiProvider: string | null;
  aiModel: string | null;
  aiTemperature: number | null;
  aiMaxTokens: number | null;
  aiHistoryEnabled: boolean;
  aiPrivacyMode: boolean;
} | null> {
  return prisma.userPreference.findUnique({
    where: { userId },
    select: {
      aiProvider: true,
      aiModel: true,
      aiTemperature: true,
      aiMaxTokens: true,
      aiHistoryEnabled: true,
      aiPrivacyMode: true,
    },
  });
}

/**
 * Resolve AiEffectivePolicy:
 * 1) explicit request overrides (optional)
 * 2) user_preferences AI columns
 * 3) system defaults (placeholderAiEffectivePolicy)
 *
 * Side-effect free: no writes, no provider calls, no prompt changes.
 */
export async function resolveAiEffectivePolicy(
  input: ResolveAiEffectivePolicyInput = {},
): Promise<AiEffectivePolicy> {
  const defaults = placeholderAiEffectivePolicy();
  const overrides = input.overrides ?? undefined;

  const prefs =
    input.userId && input.userId.trim()
      ? await readUserAiPreferences(input.userId)
      : null;

  const fromUser: AiEffectivePolicy = prefs
    ? {
        historyEnabled: prefs.aiHistoryEnabled,
        privacyMode: prefs.aiPrivacyMode,
        maxTokens: prefs.aiMaxTokens,
        temperature: prefs.aiTemperature,
        preferredProvider: normalizeOptionalString(prefs.aiProvider),
        preferredModel: normalizeOptionalString(prefs.aiModel),
      }
    : defaults;

  return {
    historyEnabled:
      overrides?.historyEnabled !== undefined
        ? overrides.historyEnabled
        : fromUser.historyEnabled,
    privacyMode:
      overrides?.privacyMode !== undefined
        ? overrides.privacyMode
        : fromUser.privacyMode,
    maxTokens:
      overrides?.maxTokens !== undefined
        ? overrides.maxTokens
        : fromUser.maxTokens,
    temperature:
      overrides?.temperature !== undefined
        ? overrides.temperature
        : fromUser.temperature,
    preferredProvider:
      overrides?.preferredProvider !== undefined
        ? normalizeOptionalString(overrides.preferredProvider)
        : fromUser.preferredProvider,
    preferredModel:
      overrides?.preferredModel !== undefined
        ? normalizeOptionalString(overrides.preferredModel)
        : fromUser.preferredModel,
  };
}
