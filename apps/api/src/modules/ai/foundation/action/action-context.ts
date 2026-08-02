/**
 * Enterprise AI Action Context.
 * Immutable action context for pipeline state and Prompt Engineering.
 * Never executes actions or calls services.
 */

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiActiveAgent } from "../agents/ai-agent.js";
import type { AiAgentDecision } from "../agents/ai-agent-decision.js";
import type { AiBusinessQuery } from "../business-query/business-query.js";
import type { AiSelectedModules } from "../modules/module-resolver.js";
import type { AiBusinessExecution } from "../business-execution/business-execution.js";
import type { AiActionCategory, AiActionDefinition } from "./action-definition.js";
import type { AiActiveAction } from "./ai-action.js";
import {
  enterpriseActionRegistry,
  type AiActionRegistry,
} from "./action-registry.js";
import { collectActionCapabilities } from "./action-capabilities.js";

/**
 * Immutable action context attached to pipeline state.
 * Safe for PE consumption; runtime formatting must omit secrets / internal ids.
 */
export interface AiActionContext {
  readonly actionId: string;
  readonly name: string;
  readonly category: AiActionCategory;
  readonly description: string;
  readonly capabilities: readonly string[];
  readonly supportedEntities: readonly string[];
  readonly supportedIntents: readonly string[];
  readonly resolutionReason: string;
  readonly fallback: boolean;
  readonly confidence: number;
  /** Resolution signal sources (agent, query, module, intent, context). */
  readonly sources: readonly string[];
}

export interface AiActionResolutionInput {
  readonly activeContext: AiActiveContext;
  readonly activeAgent?: AiActiveAgent | null;
  readonly agentDecision?: AiAgentDecision | null;
  readonly businessQuery?: AiBusinessQuery | null;
  readonly selectedModules?: AiSelectedModules | null;
  readonly businessExecution?: AiBusinessExecution | null;
  readonly mode?: string | null;
  readonly prompt?: string | null;
}

export interface BuildActionContextInput {
  readonly activeAction: AiActiveAction;
  readonly sources?: readonly string[];
  readonly registry?: AiActionRegistry;
  readonly definition?: AiActionDefinition | null;
}

/**
 * Soft intent hints derived from prompt / mode / agent / business query.
 */
export function resolveActionIntentHints(
  input: AiActionResolutionInput,
): readonly string[] {
  const hints: string[] = [];
  const mode = (input.mode ?? input.activeContext.mode ?? "")
    .toLowerCase()
    .trim();
  if (mode) hints.push(mode);

  const prompt = (input.prompt ?? "").toLowerCase();
  const keywords = [
    "task",
    "project",
    "client",
    "crm",
    "calendar",
    "meeting",
    "document",
    "report",
    "email",
    "workflow",
    "notification",
    "file",
    "storage",
    "setting",
  ] as const;

  for (const keyword of keywords) {
    if (prompt.includes(keyword)) hints.push(keyword);
  }

  if (input.agentDecision?.documentPreference === "high") {
    hints.push("document");
  }
  if (
    input.agentDecision?.toolPreference === "high" ||
    input.agentDecision?.executionMode === "workflow"
  ) {
    hints.push("task");
    hints.push("workflow");
    hints.push("calendar");
  }

  const query = input.businessQuery;
  if (query?.entity) hints.push(query.entity);
  if (query?.moduleName) hints.push(query.moduleName.toLowerCase());
  if (query?.intent) hints.push(query.intent);
  for (const filter of query?.filters ?? []) {
    hints.push(filter.replace(/_/g, " "));
  }

  for (const module of input.selectedModules?.modules ?? []) {
    hints.push(module.name.toLowerCase());
    for (const entity of module.supportedEntities) {
      hints.push(entity.toLowerCase());
    }
  }

  if (input.businessExecution && !input.businessExecution.plan.executable) {
    // planning-only signal — still useful for workflow preference
    hints.push("workflow");
  }

  return Object.freeze([...new Set(hints)]);
}

/**
 * Entity type hints from active context and business query.
 */
export function resolveActionEntityHints(
  input: AiActionResolutionInput,
): readonly string[] {
  const types = [
    ...(input.activeContext.primaryEntity
      ? [input.activeContext.primaryEntity.type.toLowerCase()]
      : []),
    ...input.activeContext.entities.map((entity) =>
      entity.type.toLowerCase(),
    ),
    ...(input.businessQuery?.entity
      ? [input.businessQuery.entity.toLowerCase()]
      : []),
  ];
  return Object.freeze([...new Set(types)]);
}

/**
 * Build an immutable Action Context from the resolved active action.
 */
export function buildActionContext(
  input: BuildActionContextInput,
): AiActionContext {
  const registry = input.registry ?? enterpriseActionRegistry;
  const definition =
    input.definition ?? registry.get(input.activeAction.id) ?? null;

  const capabilities = definition
    ? collectActionCapabilities([definition])
    : input.activeAction.capabilities;

  return Object.freeze({
    actionId: input.activeAction.id,
    name: input.activeAction.name,
    category: input.activeAction.category,
    description:
      definition?.description?.trim() ?? input.activeAction.description,
    capabilities: Object.freeze([...capabilities]),
    supportedEntities: Object.freeze([
      ...(definition?.supportedEntities ?? []),
    ]),
    supportedIntents: Object.freeze([
      ...(definition?.supportedIntents ?? []),
    ]),
    resolutionReason: input.activeAction.resolutionReason,
    fallback: input.activeAction.fallback,
    confidence: input.activeAction.confidence,
    sources: Object.freeze([...(input.sources ?? [])]),
  });
}
