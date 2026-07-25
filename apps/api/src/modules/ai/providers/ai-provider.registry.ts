/**
 * AI Provider Registry — extensible architecture for Gemini (default),
 * OpenAI, Claude, and Mock. Add a future provider by registering a descriptor;
 * do not rewrite resolution logic in the factory.
 */

import type { AiProvider } from "./ai-provider.js";
import type { AiProviderId } from "./ai-runtime-config.js";
import { getAiRuntimeState } from "./ai-runtime-config.js";
import { ClaudeProvider } from "./claude.provider.js";
import { GeminiProvider } from "./gemini.provider.js";
import { MockAiProvider } from "./mock-ai.provider.js";
import { OpenAiProvider } from "./openai.provider.js";

/** Canonical default — EliteFlow ERP primary AI provider. */
export const DEFAULT_AI_PROVIDER_ID: AiProviderId = "gemini";

export interface AiProviderResolveContext {
  apiKey: string | null;
  model: string | null;
}

export interface AiProviderRegistration {
  id: AiProviderId;
  label: string;
  /** Selected when Settings / env preference is unset. */
  isDefault?: boolean;
  /**
   * false = registered for future switching; resolve() must return null
   * until the live implementation ships (no factory rewrite required).
   */
  isLive: boolean;
  resolve(ctx: AiProviderResolveContext): AiProvider | null;
}

const mockProvider = new MockAiProvider();

function envKey(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function envModel(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

/**
 * Ordered registry. Default provider first among live providers for fallback.
 * Future: flip Claude `isLive` to true and implement resolve() — no other changes.
 */
export const AI_PROVIDER_REGISTRY: readonly AiProviderRegistration[] = [
  {
    id: "gemini",
    label: "Gemini AI",
    isDefault: true,
    isLive: true,
    resolve(ctx) {
      const apiKey = ctx.apiKey || envKey("GEMINI_API_KEY");
      if (!apiKey) return null;
      const model =
        ctx.model || envModel("GEMINI_MODEL", "gemini-flash-latest");
      return new GeminiProvider(apiKey, model);
    },
  },
  {
    id: "openai",
    label: "OpenAI",
    isLive: true,
    resolve(ctx) {
      const apiKey = ctx.apiKey || envKey("OPENAI_API_KEY");
      if (!apiKey) return null;
      const model = ctx.model || envModel("OPENAI_MODEL", "gpt-4o-mini");
      return new OpenAiProvider(apiKey, model);
    },
  },
  {
    id: "claude",
    label: "Claude",
    /** Architecture reserved — enable without rewriting the factory. */
    isLive: false,
    resolve(ctx) {
      const apiKey = ctx.apiKey || envKey("ANTHROPIC_API_KEY");
      if (!apiKey) return null;
      const model =
        ctx.model || envModel("ANTHROPIC_MODEL", "claude-sonnet-4-20250514");
      return new ClaudeProvider(apiKey, model);
    },
  },
  {
    id: "mock",
    label: "Mock (development)",
    isLive: true,
    resolve() {
      return mockProvider;
    },
  },
] as const;

export function getAiProviderRegistration(
  id: AiProviderId,
): AiProviderRegistration | undefined {
  return AI_PROVIDER_REGISTRY.find((entry) => entry.id === id);
}

export function listAiProviderRegistrations(): readonly AiProviderRegistration[] {
  return AI_PROVIDER_REGISTRY;
}

export function buildResolveContext(
  id: AiProviderId,
): AiProviderResolveContext {
  const runtime = getAiRuntimeState();
  return {
    apiKey: runtime.apiKeys[id] ?? null,
    model: runtime.models[id] ?? null,
  };
}

export function resolveRegisteredProvider(
  id: AiProviderId,
): AiProvider | null {
  const registration = getAiProviderRegistration(id);
  if (!registration || !registration.isLive) return null;
  return registration.resolve(buildResolveContext(id));
}

/** Fallback order when preferred provider is unavailable: Gemini → OpenAI → Mock. */
export function resolveDefaultLiveProvider(): AiProvider {
  const preferredOrder: AiProviderId[] = [
    DEFAULT_AI_PROVIDER_ID,
    "openai",
    "mock",
  ];

  for (const id of preferredOrder) {
    const provider = resolveRegisteredProvider(id);
    if (provider) return provider;
  }

  return mockProvider;
}
