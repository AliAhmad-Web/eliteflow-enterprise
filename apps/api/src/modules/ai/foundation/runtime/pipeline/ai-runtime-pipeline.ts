import {
  emptyAiActiveContext,
  placeholderAiEffectivePolicy,
} from "../../contracts/defaults.js";
import type { AiMemoryMessage } from "../../contracts/ai-memory-message.js";
import type { AiContextHints } from "../../context/resolve-active-context.js";
import type { AiPolicyOverrides } from "../../settings/settings-enforcer.js";
import type { AiRuntimePipelineState } from "./pipeline-state.js";
import {
  contextStage,
  memoryLoadStage,
  memoryStage,
  policyStage,
  promptEngineeringStage,
  providerRequestStage,
  providerResolutionStage,
  providerStage,
  requestStage,
  responseStage,
  memorySaveStage,
  toolDiscoveryStage,
  toolExecutionStage,
  toolPlanningStage,
  toolRegistryStage,
  toolResultInjectionStage,
  toolResultValidationStage,
  toolAuditStage,
  agentResolutionStage,
  agentContextStage,
  agentPromptStrategyStage,
  agentMemoryStrategyStage,
  agentDecisionStage,
  agentCollaborationStage,
  agentPermissionsStage,
  businessQueryStage,
  moduleResolutionStage,
  moduleDataStage,
  businessReasoningStage,
  businessDecisionStage,
  businessActionStage,
  businessWorkflowStage,
  businessIntelligenceStage,
  businessRecommendationStage,
  businessExecutionStage,
  actionResolutionStage,
  actionPlanningStage,
  workflowOrchestrationStage,
  actionExecutionStage,
  automationStage,
  memoryOrchestratorStage,
  memoryWorkingStage,
  memoryEpisodicStage,
  memoryRetrievalStage,
  memorySemanticStage,
  memoryKnowledgeStage,
  memoryLongTermStage,
  memoryRankingStage,
  memoryContextStage,
  memoryConsolidationStage,
  memoryPlatformStage,
  agentAnalyticsStage,
  toolRoutingStage,
  toolSelectionStage,
  toolStage,
  type AiPipelineStage,
} from "../stages/index.js";

export type { AiRuntimePipelineState } from "./pipeline-state.js";

const DEFAULT_STAGES: readonly AiPipelineStage[] = [
  requestStage,
  memoryLoadStage,
  contextStage,
  policyStage,
  providerResolutionStage,
  agentResolutionStage,
  agentContextStage,
  agentPromptStrategyStage,
  agentMemoryStrategyStage,
  agentDecisionStage,
  agentCollaborationStage,
  agentPermissionsStage,
  businessQueryStage,
  moduleResolutionStage,
  moduleDataStage,
  businessReasoningStage,
  businessDecisionStage,
  businessActionStage,
  businessWorkflowStage,
  businessIntelligenceStage,
  businessRecommendationStage,
  businessExecutionStage,
  actionResolutionStage,
  actionPlanningStage,
  workflowOrchestrationStage,
  actionExecutionStage,
  automationStage,
  memoryOrchestratorStage,
  memoryWorkingStage,
  memoryEpisodicStage,
  memoryRetrievalStage,
  memorySemanticStage,
  memoryKnowledgeStage,
  memoryLongTermStage,
  memoryRankingStage,
  memoryContextStage,
  memoryConsolidationStage,
  memoryPlatformStage,
  memoryStage,
  toolRegistryStage,
  toolDiscoveryStage,
  toolStage,
  toolRoutingStage,
  toolSelectionStage,
  toolPlanningStage,
  toolExecutionStage,
  toolResultValidationStage,
  toolResultInjectionStage,
  toolAuditStage,
  agentAnalyticsStage,
  promptEngineeringStage,
  providerRequestStage,
  providerStage,
  responseStage,
  memorySaveStage,
];

export interface AiRuntimePipelineRunOptions {
  readonly userId?: string | null;
  readonly policyOverrides?: AiPolicyOverrides | null;
  readonly contextHints?: AiContextHints | null;
  readonly conversationHistory?: readonly AiMemoryMessage[];
  readonly prompt?: string;
  readonly mode?: string;
  readonly streaming?: boolean;
}

function createInitialState<TResult>(
  execute: AiRuntimePipelineState<TResult>["execute"],
  options: AiRuntimePipelineRunOptions = {},
): AiRuntimePipelineState<TResult> {
  return {
    execute,
    userId: options.userId,
    policyOverrides: options.policyOverrides,
    contextHints: options.contextHints,
    prompt: options.prompt,
    mode: options.mode,
    streaming: options.streaming ?? false,
    conversationHistory: options.conversationHistory ?? [],
    providerHistory: [],
    activeContext: emptyAiActiveContext(),
    policy: placeholderAiEffectivePolicy(),
    toolExecutions: [],
  };
}

export class AiRuntimePipeline {
  constructor(private readonly stages: readonly AiPipelineStage[] = DEFAULT_STAGES) {}

  async run<TResult>(
    execute: AiRuntimePipelineState<TResult>["execute"],
    options: AiRuntimePipelineRunOptions = {},
  ): Promise<TResult> {
    let state: AiRuntimePipelineState<TResult> = createInitialState(
      execute,
      options,
    );

    for (const stage of this.stages) {
      state = await stage.run(state);
    }

    if (state.result === undefined) {
      throw new Error(
        "AI runtime pipeline completed without a provider result",
      );
    }

    return state.result;
  }
}

export const aiRuntimePipeline = new AiRuntimePipeline();
