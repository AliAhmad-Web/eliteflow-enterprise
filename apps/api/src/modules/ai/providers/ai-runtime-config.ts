/**
 * In-memory AI provider runtime config.
 * Provider-keyed maps so OpenAI / Claude can be added without rewriting this module.
 * Secrets never leave the server process / API responses.
 */

export type AiProviderId = "gemini" | "openai" | "claude" | "mock";

export const AI_PROVIDER_IDS: readonly AiProviderId[] = [
  "gemini",
  "openai",
  "claude",
  "mock",
] as const;

interface AiRuntimeState {
  /** Explicit Settings / env preference. Null → factory uses Gemini default. */
  preferred: AiProviderId | null;
  apiKeys: Partial<Record<AiProviderId, string>>;
  models: Partial<Record<AiProviderId, string>>;
}

const state: AiRuntimeState = {
  preferred: null,
  apiKeys: {},
  models: {},
};

function isAiProviderId(value: string): value is AiProviderId {
  return (AI_PROVIDER_IDS as readonly string[]).includes(value);
}

export function setAiPreferredProvider(
  preferred: string | null | undefined,
): void {
  if (!preferred) {
    state.preferred = null;
    return;
  }
  const normalized = preferred.trim().toLowerCase();
  state.preferred = isAiProviderId(normalized) ? normalized : null;
}

export function setAiProviderApiKey(
  providerId: Exclude<AiProviderId, "mock">,
  key: string | null,
): void {
  const trimmed = key?.trim() || null;
  if (!trimmed) {
    delete state.apiKeys[providerId];
    return;
  }
  state.apiKeys[providerId] = trimmed;
}

export function setAiProviderModel(
  providerId: Exclude<AiProviderId, "mock">,
  model: string | null | undefined,
): void {
  const trimmed = model?.trim() || null;
  if (!trimmed) {
    delete state.models[providerId];
    return;
  }
  state.models[providerId] = trimmed;
}

/** @deprecated Prefer setAiProviderModel — kept for Settings wiring compatibility. */
export function setAiModelHints(input: {
  geminiModel?: string | null;
  openaiModel?: string | null;
  claudeModel?: string | null;
}): void {
  if (input.geminiModel !== undefined) {
    setAiProviderModel("gemini", input.geminiModel);
  }
  if (input.openaiModel !== undefined) {
    setAiProviderModel("openai", input.openaiModel);
  }
  if (input.claudeModel !== undefined) {
    setAiProviderModel("claude", input.claudeModel);
  }
}

export function getAiRuntimeState(): Readonly<AiRuntimeState> {
  return {
    preferred: state.preferred,
    apiKeys: { ...state.apiKeys },
    models: { ...state.models },
  };
}
