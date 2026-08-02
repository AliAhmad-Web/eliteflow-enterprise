/**
 * Enterprise AI Action Framework public exports.
 * Metadata resolution only — never executes actions or calls services.
 */

export type { AiActionCategory, AiActionDefinition } from "./action-definition.js";
export type { AiActiveAction } from "./ai-action.js";
export { DEFAULT_GENERIC_ACTION_ID } from "./ai-action.js";
export { AiActionRegistry, enterpriseActionRegistry } from "./action-registry.js";
export {
  BUILTIN_ACTIONS,
  TASK_ACTION,
  PROJECT_ACTION,
  CRM_ACTION,
  CALENDAR_ACTION,
  DOCUMENT_ACTION,
  REPORT_ACTION,
  EMAIL_ACTION,
  WORKFLOW_ACTION,
  NOTIFICATION_ACTION,
  STORAGE_ACTION,
  SETTINGS_ACTION,
  GENERIC_ACTION,
} from "./builtin-actions.js";
export type {
  ResolveActiveActionInput,
  ResolveActiveActionResult,
} from "./action-resolver.js";
export { resolveActiveAction } from "./action-resolver.js";
export type {
  AiActionContext,
  AiActionResolutionInput,
  BuildActionContextInput,
} from "./action-context.js";
export {
  buildActionContext,
  resolveActionIntentHints,
  resolveActionEntityHints,
} from "./action-context.js";
export {
  toActiveActionSummary,
  collectActionCapabilities,
} from "./action-capabilities.js";
export {
  formatActiveActionForRuntime,
  formatActionContextForRuntime,
} from "./action-runtime.js";
export type { AiActionPlan } from "./planning/index.js";
export type { ResolveActionPlanInput } from "./planning/index.js";
export {
  resolveActionPlan,
  actionPlanEngine,
  formatActionPlanForRuntime,
} from "./planning/index.js";
export type {
  AiActionExecution,
  ResolveActionExecutionInput,
} from "./execution/index.js";
export {
  resolveActionExecution,
  actionExecutionEngine,
  formatActionExecutionForRuntime,
} from "./execution/index.js";
