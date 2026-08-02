/**
 * Internal Enterprise AI Foundation contracts.
 * Types only — no runtime behavior. Stable shared language for orchestrator stages.
 */

export type {
  AiExecutionContext,
  AiFoundationSurface,
} from "./ai-execution-context.js";
export type {
  AiFoundationAttachment,
  AiFoundationRequest,
  AiFoundationRequestMetadata,
} from "./ai-foundation-request.js";
export type {
  AiFoundationResponse,
  AiFoundationTokenUsage,
  AiFinishReason,
} from "./ai-foundation-response.js";
export type {
  AiActiveContext,
  AiContextEntityRef,
  AiContextIdentity,
  AiContextOrganization,
  AiContextSnippet,
} from "./ai-active-context.js";
export type { AiEffectivePolicy } from "./ai-effective-policy.js";
export type { AiMemoryMessage } from "./ai-memory-message.js";
export type {
  AiEngineeredPrompt,
  AiEngineeredPromptSections,
} from "./ai-engineered-prompt.js";
export type { AiProviderRequest } from "./ai-provider-request.js";
export type { AiResolvedProviderBinding } from "./ai-resolved-provider-binding.js";
export type {
  AiToolExecution,
  AiToolExecutionStatus,
  AiToolId,
} from "./ai-tool-execution.js";
export type { AiFoundationResult } from "./ai-foundation-result.js";
export {
  emptyAiActiveContext,
  placeholderAiEffectivePolicy,
} from "./defaults.js";
