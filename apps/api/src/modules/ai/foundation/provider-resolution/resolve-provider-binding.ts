import type { AiEffectivePolicy } from "../contracts/ai-effective-policy.js";
import type { AiResolvedProviderBinding } from "../contracts/ai-resolved-provider-binding.js";
import {
  AI_PROVIDER_IDS,
  type AiProviderId,
  getAiRuntimeState,
} from "../../providers/ai-runtime-config.js";
import {
  DEFAULT_AI_PROVIDER_ID,
  buildResolveContext,
  getAiProviderRegistration,
  resolveRegisteredProvider,
} from "../../providers/ai-provider.registry.js";

const FALLBACK_ORDER: readonly AiProviderId[] = [
  DEFAULT_AI_PROVIDER_ID,
  "openai",
  "mock",
];

function asProviderId(value: string | null | undefined): AiProviderId | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return (AI_PROVIDER_IDS as readonly string[]).includes(normalized)
    ? (normalized as AiProviderId)
    : null;
}

function normalizeModel(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Candidate provider id mirrors existing factory preference order:
 * policy → runtime preferred → AI_PROVIDER env → registry default.
 */
function resolveRequestedProviderId(
  policy: AiEffectivePolicy,
): AiProviderId {
  const fromPolicy = asProviderId(policy.preferredProvider);
  if (fromPolicy) return fromPolicy;

  const runtime = getAiRuntimeState();
  if (runtime.preferred) return runtime.preferred;

  const fromEnv = asProviderId(process.env.AI_PROVIDER);
  if (fromEnv) return fromEnv;

  return DEFAULT_AI_PROVIDER_ID;
}

function isProviderAvailable(
  id: AiProviderId,
  model: string | null,
): boolean {
  const registration = getAiProviderRegistration(id);
  if (!registration || !registration.isLive) return false;

  if (id === "mock") {
    return resolveRegisteredProvider("mock") !== null;
  }

  const ctx = buildResolveContext(id);
  const resolved = registration.resolve({
    apiKey: ctx.apiKey,
    model: model ?? ctx.model,
  });
  return resolved !== null;
}

function resolveDefaultModel(id: AiProviderId): string | null {
  const ctx = buildResolveContext(id);
  if (ctx.model) return ctx.model;

  switch (id) {
    case "gemini":
      return process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";
    case "openai":
      return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    case "claude":
      return process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514";
    case "mock":
      return null;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

/**
 * Resolve effective provider + model from policy against the Provider Registry.
 * Side-effect free aside from reading env/runtime config (no DB writes, no generate).
 */
export function resolveProviderBinding(
  policy: AiEffectivePolicy,
): AiResolvedProviderBinding {
  const requestedProviderId = resolveRequestedProviderId(policy);
  const requestedModel = normalizeModel(policy.preferredModel);

  const explicitRequest = asProviderId(policy.preferredProvider);

  if (isProviderAvailable(requestedProviderId, requestedModel)) {
    const model = requestedModel ?? resolveDefaultModel(requestedProviderId);
    return {
      providerId: requestedProviderId,
      model,
      usedFallback: false,
      requestedProviderId: explicitRequest,
      requestedModel,
    };
  }

  // Requested model may be the only problem — retry provider with default model.
  if (
    requestedModel &&
    isProviderAvailable(requestedProviderId, null)
  ) {
    return {
      providerId: requestedProviderId,
      model: resolveDefaultModel(requestedProviderId),
      usedFallback: false,
      requestedProviderId: explicitRequest,
      requestedModel,
    };
  }

  for (const fallbackId of FALLBACK_ORDER) {
    if (fallbackId === requestedProviderId) continue;
    if (!isProviderAvailable(fallbackId, null)) continue;

    return {
      providerId: fallbackId,
      model: resolveDefaultModel(fallbackId),
      usedFallback: true,
      requestedProviderId: explicitRequest ?? requestedProviderId,
      requestedModel,
    };
  }

  // Registry always includes mock as last resort.
  return {
    providerId: "mock",
    model: null,
    usedFallback: true,
    requestedProviderId: explicitRequest ?? requestedProviderId,
    requestedModel,
  };
}
