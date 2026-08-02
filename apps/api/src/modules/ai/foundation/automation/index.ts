/**
 * Enterprise AI Automation Integration public exports.
 * EliteFlow AI remains the brain; providers are automation engines only.
 */

export type {
  AiAutomationProviderKind,
  AiAutomationProviderDefinition,
} from "./automation-provider-definition.js";
export { formatAutomationProviderKind } from "./automation-provider-definition.js";

export type { AiAutomationProvider } from "./automation-provider.js";

export {
  AiAutomationProviderRegistry,
  enterpriseAutomationProviderRegistry,
} from "./automation-provider-registry.js";

export type { AiAutomationProviderContext } from "./automation-provider-context.js";
export { buildAutomationProviderContext } from "./automation-provider-context.js";

export type { AiAutomationStatus } from "./automation-status.js";
export { formatAutomationStatus } from "./automation-status.js";

export type {
  AiAutomationError,
  AiAutomationErrorCode,
} from "./automation-errors.js";
export {
  createAutomationError,
  isRetryableAutomationError,
} from "./automation-errors.js";

export type {
  AiAutomationRequest,
  AiAutomationValidatedContext,
  AiAutomationExecutionMode,
} from "./automation-request.js";
export { buildValidatedAutomationContext } from "./automation-request.js";

export type { AiAutomationResponse } from "./automation-response.js";

export type { AiAutomationRetryPolicy } from "./automation-retry.js";
export {
  buildAutomationRetryPolicy,
  shouldRetryAutomation,
  waitAutomationBackoff,
} from "./automation-retry.js";

export type {
  AiAutomationAuditRecord,
  AiAutomationAuditEvent,
  AiAutomationAuditEventType,
} from "./automation-audit.js";
export { buildAutomationAuditRecord } from "./automation-audit.js";

export type { AiAutomationTelemetry } from "./automation-telemetry.js";
export { buildAutomationTelemetry } from "./automation-telemetry.js";

export type { AiN8nWorkflowRef } from "./n8n-workflow.js";
export { buildN8nWorkflowRef } from "./n8n-workflow.js";

export type { AiN8nTrigger, AiN8nTriggerKind } from "./n8n-trigger.js";
export { buildN8nTrigger } from "./n8n-trigger.js";

export type { AiN8nExecutionRef } from "./n8n-execution.js";
export { createN8nExecutionRef } from "./n8n-execution.js";

export type { AiN8nResult } from "./n8n-result.js";
export { buildN8nResult } from "./n8n-result.js";

export type { AiN8nClientDispatch } from "./n8n-client.js";
export { dispatchN8nStub, cancelN8nStub } from "./n8n-client.js";

export {
  N8N_PROVIDER_ID,
  N8N_PROVIDER_DEFINITION,
  createN8nProvider,
  n8nAutomationProvider,
} from "./n8n-provider.js";

export type {
  AiAutomationExecution,
  ResolveAutomationExecutionInput,
} from "./automation-engine.js";
export {
  resolveAutomationExecution,
  automationEngine,
} from "./automation-engine.js";

export { formatAutomationExecutionForRuntime } from "./automation-provider-runtime.js";
