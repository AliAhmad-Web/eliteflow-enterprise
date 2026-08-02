/**
 * Structured provider prompt sections from the Prompt Engineering Stage.
 * User prompt is never rewritten. Business record contents are never injected.
 */
import type { AiMemoryMessage } from "./ai-memory-message.js";

export interface AiEngineeredPromptSections {
  readonly system: string;
  /** Safe runtime metadata only (module, surface, role, etc.). */
  readonly runtime: string;
  readonly history: readonly AiMemoryMessage[];
  readonly user: string;
}

export interface AiEngineeredPrompt {
  readonly systemInstructions: string;
  readonly runtimeInstructions: string;
  readonly history: readonly AiMemoryMessage[];
  /** Current user message — identical to inbound prompt. */
  readonly userPrompt: string;
  readonly sections: AiEngineeredPromptSections;
}
