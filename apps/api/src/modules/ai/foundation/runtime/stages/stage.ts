/**
 * Pipeline stage contract — independent, stateless, replaceable.
 * No-op stages return the same state reference (input === output).
 */

import type { AiRuntimePipelineState } from "../pipeline/pipeline-state.js";

export interface AiPipelineStage {
  readonly name: string;
  run<TResult>(
    state: AiRuntimePipelineState<TResult>,
  ): Promise<AiRuntimePipelineState<TResult>>;
}
