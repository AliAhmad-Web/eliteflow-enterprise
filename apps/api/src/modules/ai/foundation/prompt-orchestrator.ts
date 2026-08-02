/**
 * Enterprise Prompt Orchestrator.
 *
 * Runs the Runtime Pipeline. Memory Stage prepares providerHistory;
 * Provider Stage passes pipeline state into the existing AiService execute.
 */

import {
  aiRuntimePipeline,
  type AiRuntimePipelineRunOptions,
} from "./runtime/pipeline/ai-runtime-pipeline.js";
import type { AiRuntimePipelineState } from "./runtime/pipeline/pipeline-state.js";

export type AiOrchestratorRunOptions = AiRuntimePipelineRunOptions;

export class PromptOrchestrator {
  async runChat<T>(
    execute: AiRuntimePipelineState<T>["execute"],
    options: AiOrchestratorRunOptions = {},
  ): Promise<T> {
    return aiRuntimePipeline.run(execute, options);
  }

  async runChatStream<T>(
    execute: AiRuntimePipelineState<T>["execute"],
    options: AiOrchestratorRunOptions = {},
  ): Promise<T> {
    return aiRuntimePipeline.run(execute, options);
  }
}

export const promptOrchestrator = new PromptOrchestrator();
