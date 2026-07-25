/**
 * Resolve the active AI provider via the provider registry.
 *
 * Rules:
 * - Gemini is the default provider (DEFAULT_AI_PROVIDER_ID).
 * - OpenAI / Claude are registered for future switching without factory rewrites.
 * - No hardcoded provider branching beyond preference → registry lookup → fallback.
 */

import type { AiProvider } from "./ai-provider.js";
import type { AiProviderId } from "./ai-runtime-config.js";
import { getAiRuntimeState } from "./ai-runtime-config.js";
import {
  DEFAULT_AI_PROVIDER_ID,
  getAiProviderRegistration,
  resolveDefaultLiveProvider,
  resolveRegisteredProvider,
} from "./ai-provider.registry.js";

let loggedProvider: string | null = null;

function logProviderOnce(label: string): void {
  if (loggedProvider === label) return;
  loggedProvider = label;
  console.log(`[ai] Provider: ${label}`);
}

function resolvePreferredId(): AiProviderId {
  const runtime = getAiRuntimeState();
  const fromEnv = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (runtime.preferred) return runtime.preferred;
  if (
    fromEnv === "gemini" ||
    fromEnv === "openai" ||
    fromEnv === "claude" ||
    fromEnv === "mock"
  ) {
    return fromEnv;
  }
  return DEFAULT_AI_PROVIDER_ID;
}

export function getAiProvider(): AiProvider {
  const preferred = resolvePreferredId();

  if (preferred === "mock") {
    const mock = resolveRegisteredProvider("mock");
    logProviderOnce(
      "mock (connect Gemini in Integration Center or set GEMINI_API_KEY for live AI)",
    );
    return mock!;
  }

  const preferredProvider = resolveRegisteredProvider(preferred);
  if (preferredProvider) {
    const registration = getAiProviderRegistration(preferred);
    logProviderOnce(
      `${preferredProvider.name}${registration ? ` (${registration.label})` : ""}`,
    );
    return preferredProvider;
  }

  // Preferred unavailable or not live yet (e.g. Claude) → Gemini-first fallback chain.
  if (preferred !== DEFAULT_AI_PROVIDER_ID) {
    const registration = getAiProviderRegistration(preferred);
    if (registration && !registration.isLive) {
      console.warn(
        `[ai] Provider "${preferred}" is registered but not live yet. Falling back to ${DEFAULT_AI_PROVIDER_ID}.`,
      );
    }
  }

  const fallback = resolveDefaultLiveProvider();
  logProviderOnce(`${fallback.name} (default fallback)`);
  return fallback;
}

/** @deprecated Prefer getAiProvider(). */
export function createAiProvider(): AiProvider {
  return getAiProvider();
}

/** Lazy-compatible export used by existing service imports. */
export const aiProvider: AiProvider = {
  get name() {
    return getAiProvider().name;
  },
  generate(params) {
    return getAiProvider().generate(params);
  },
  generateStream(params, handlers) {
    const provider = getAiProvider();
    if (provider.generateStream) {
      return provider.generateStream(params, handlers);
    }
    return provider.generate(params).then(async (result) => {
      await handlers?.onDelta?.(result.content);
      return result;
    });
  },
};
