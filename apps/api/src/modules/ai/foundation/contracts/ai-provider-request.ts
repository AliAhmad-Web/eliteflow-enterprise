import type { AiActiveContext } from "./ai-active-context.js";
import type { AiEffectivePolicy } from "./ai-effective-policy.js";
import type { AiEngineeredPrompt } from "./ai-engineered-prompt.js";
import type { AiMemoryMessage } from "./ai-memory-message.js";
import type { AiResolvedProviderBinding } from "./ai-resolved-provider-binding.js";
import type { AiToolExecution } from "./ai-tool-execution.js";

/**
 * Immutable provider-ready request assembled by the Provider Request Builder.
 */
export interface AiProviderRequest {
  /** Current user message (from engineered prompt / inbound). */
  readonly prompt: string;
  readonly mode: string;
  readonly history: readonly AiMemoryMessage[];
  readonly streaming: boolean;
  readonly providerBinding: AiResolvedProviderBinding | null;
  readonly policy: AiEffectivePolicy;
  readonly activeContext: AiActiveContext;
  readonly eligibleTools: readonly AiToolExecution[];
  readonly temperature: number | null;
  readonly maxTokens: number | null;
  /** Structured sections — source of truth for prompt construction. */
  readonly engineeredPrompt: AiEngineeredPrompt | null;
}
