import type { AiActiveContext } from "./ai-active-context.js";
import type { AiEffectivePolicy } from "./ai-effective-policy.js";
import type { AiExecutionContext } from "./ai-execution-context.js";
import type { AiFoundationResponse } from "./ai-foundation-response.js";
import type { AiToolExecution } from "./ai-tool-execution.js";

/**
 * Final internal result of one foundation pipeline run.
 * Stages may attach empty/default context, policy, and tools until implemented.
 */
export interface AiFoundationResult {
  readonly executionContext: AiExecutionContext;
  readonly response: AiFoundationResponse;
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
  /** Always empty until Tool Runner exists. */
  readonly toolExecutions: readonly AiToolExecution[];
}
