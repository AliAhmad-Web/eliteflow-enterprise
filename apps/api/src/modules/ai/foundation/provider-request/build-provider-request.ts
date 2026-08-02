import type { AiProviderRequest } from "../contracts/ai-provider-request.js";
import type { AiRuntimePipelineState } from "../runtime/pipeline/pipeline-state.js";

/**
 * Assemble an immutable provider request from pipeline state.
 * Prefers Prompt Engineering output for prompt + history when present.
 */
export function buildProviderRequest<TResult>(
  state: AiRuntimePipelineState<TResult>,
): AiProviderRequest {
  const engineered = state.engineeredPrompt ?? null;
  const prompt = engineered?.userPrompt ?? state.prompt ?? "";
  const mode = state.mode ?? "ASK";
  const streaming = state.streaming ?? false;
  const history = engineered?.history ?? state.providerHistory;

  return {
    prompt,
    mode,
    history,
    streaming,
    providerBinding: state.providerBinding ?? null,
    policy: state.policy,
    activeContext: state.activeContext,
    eligibleTools: state.toolExecutions,
    temperature: state.policy.temperature,
    maxTokens: state.policy.maxTokens,
    engineeredPrompt: engineered,
  };
}
