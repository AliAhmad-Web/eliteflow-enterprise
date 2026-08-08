/**
 * Provider-independent pricing & token estimation.
 * Cost math lives here — providers must not embed budget logic.
 */

import type { AiBudgetTokenUsage } from "./ai-budget.types.js";

/** USD per 1M tokens (input / output). Approximate public list prices. */
const MODEL_PRICING: Record<
  string,
  { inputPerMillion: number; outputPerMillion: number }
> = {
  // Gemini
  "gemini-flash-latest": { inputPerMillion: 0.075, outputPerMillion: 0.3 },
  "gemini-2.0-flash": { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  "gemini-1.5-flash": { inputPerMillion: 0.075, outputPerMillion: 0.3 },
  "gemini-1.5-pro": { inputPerMillion: 1.25, outputPerMillion: 5 },
  // OpenAI
  "gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  "gpt-4o": { inputPerMillion: 2.5, outputPerMillion: 10 },
  "gpt-4.1-mini": { inputPerMillion: 0.4, outputPerMillion: 1.6 },
  "gpt-4.1": { inputPerMillion: 2, outputPerMillion: 8 },
  // Claude (stub / future)
  "claude-3-5-sonnet": { inputPerMillion: 3, outputPerMillion: 15 },
  "claude-3-haiku": { inputPerMillion: 0.25, outputPerMillion: 1.25 },
  // Mock / unknown
  mock: { inputPerMillion: 0, outputPerMillion: 0 },
};

const PROVIDER_DEFAULTS: Record<
  string,
  { inputPerMillion: number; outputPerMillion: number }
> = {
  gemini: { inputPerMillion: 0.075, outputPerMillion: 0.3 },
  openai: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  claude: { inputPerMillion: 3, outputPerMillion: 15 },
  mock: { inputPerMillion: 0, outputPerMillion: 0 },
};

export function estimateTokensFromText(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export function resolvePricing(
  providerId: string,
  modelId?: string | null,
): { inputPerMillion: number; outputPerMillion: number } {
  const modelKey = (modelId ?? "").trim().toLowerCase();
  if (modelKey && MODEL_PRICING[modelKey]) {
    return MODEL_PRICING[modelKey];
  }
  // Partial model match (e.g. gemini-flash-latest-xyz)
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (modelKey.includes(key) || key.includes(modelKey)) {
      return pricing;
    }
  }
  const providerKey = providerId.trim().toLowerCase();
  return (
    PROVIDER_DEFAULTS[providerKey] ?? {
      inputPerMillion: 0.5,
      outputPerMillion: 1.5,
    }
  );
}

export function estimateCostUsd(input: {
  providerId: string;
  modelId?: string | null;
  promptTokens: number;
  completionTokens: number;
  cachedTokens?: number;
}): number {
  const pricing = resolvePricing(input.providerId, input.modelId);
  const cached = Math.max(0, input.cachedTokens ?? 0);
  const billablePrompt = Math.max(0, input.promptTokens - cached * 0.5);
  const inputCost = (billablePrompt / 1_000_000) * pricing.inputPerMillion;
  const outputCost =
    (Math.max(0, input.completionTokens) / 1_000_000) *
    pricing.outputPerMillion;
  return roundUsd(inputCost + outputCost);
}

export function estimateUsageFromTexts(input: {
  providerId: string;
  modelId?: string | null;
  promptText: string;
  completionText?: string;
  historyTexts?: readonly string[];
  completionEstimate?: number;
}): {
  usage: AiBudgetTokenUsage;
  estimatedCostUsd: number;
} {
  const historyTokens = (input.historyTexts ?? []).reduce(
    (sum, t) => sum + estimateTokensFromText(t),
    0,
  );
  const promptTokens =
    estimateTokensFromText(input.promptText) + historyTokens;
  const completionTokens = input.completionText
    ? estimateTokensFromText(input.completionText)
    : Math.max(0, input.completionEstimate ?? 0);
  const usage: AiBudgetTokenUsage = {
    promptTokens,
    completionTokens,
    cachedTokens: 0,
    totalTokens: promptTokens + completionTokens,
  };
  return {
    usage,
    estimatedCostUsd: estimateCostUsd({
      providerId: input.providerId,
      modelId: input.modelId,
      promptTokens,
      completionTokens,
    }),
  };
}

export function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function periodKeyForType(
  type: "MONTHLY" | "DAILY" | "TOKEN" | "REQUEST" | "PROVIDER" | "MODEL",
  now = new Date(),
): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  switch (type) {
    case "DAILY":
    case "REQUEST":
      return `${y}-${m}-${d}`;
    case "MONTHLY":
    case "TOKEN":
    case "PROVIDER":
    case "MODEL":
    default:
      return `${y}-${m}`;
  }
}
