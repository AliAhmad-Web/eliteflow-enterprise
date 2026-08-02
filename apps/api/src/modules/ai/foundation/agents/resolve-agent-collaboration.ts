/**
 * Agent Collaboration Resolver.
 * Builds immutable multi-agent collaboration metadata.
 * Never executes agents or tools.
 */

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiActiveAgent, AiAgentDefinition, AiAgentType } from "./ai-agent.js";
import type { AiAgentDecision } from "./ai-agent-decision.js";
import type {
  AiAgentCollaboration,
  AiAgentCollaborationMode,
  AiAgentCollaborationParticipant,
} from "./ai-agent-collaboration.js";
import { BUILTIN_COLLABORATION_RULES } from "./builtin-collaboration-rules.js";
import {
  enterpriseAgentRegistry,
  type AiAgentRegistry,
} from "./agent-registry.js";

export interface ResolveAgentCollaborationInput {
  readonly activeAgent?: AiActiveAgent | null;
  readonly agentDecision?: AiAgentDecision | null;
  readonly activeContext?: AiActiveContext | null;
  readonly registry?: AiAgentRegistry;
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

function sanitizeReason(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, 160);
}

function findEnabledByType(
  registry: AiAgentRegistry,
  type: AiAgentType,
): AiAgentDefinition | undefined {
  return registry
    .listEnabled()
    .find((agent) => agent.type === type && agent.enabled !== false);
}

function toParticipant(
  definition: Pick<AiAgentDefinition, "name" | "type">,
  role: AiAgentCollaborationParticipant["role"],
): AiAgentCollaborationParticipant {
  return Object.freeze({
    name: definition.name.trim() || "Agent",
    type: definition.type,
    role,
  });
}

function uniqueLabels(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const label = raw.replace(/[\r\n\t]+/g, " ").trim().slice(0, 64);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return Object.freeze(out);
}

function capabilityLabels(
  primary: AiActiveAgent,
  primaryDefinition: AiAgentDefinition | null,
  supporting: AiAgentDefinition | null,
): readonly string[] {
  const tools = [
    ...(primary.preferredTools ?? []),
    ...(primaryDefinition?.preferredTools ?? []),
    ...(supporting?.preferredTools ?? []),
  ];
  const modes = [
    ...(primaryDefinition?.modes ?? []),
    ...(supporting?.modes ?? []),
  ].map((mode) => String(mode).toUpperCase());

  return uniqueLabels([
    ...tools,
    ...modes.map((mode) => `mode:${mode}`),
  ]);
}

function resolveMode(
  base: AiAgentCollaborationMode,
  decision?: AiAgentDecision | null,
  hasSupporting?: boolean,
): AiAgentCollaborationMode {
  if (!hasSupporting) return "solo";

  if (decision?.executionMode === "respond-only") {
    return "advisory";
  }
  if (
    decision?.toolPreference === "high" ||
    decision?.executionMode === "workflow" ||
    decision?.executionMode === "tool-assisted"
  ) {
    return base === "advisory" ? "advisory" : "sequential";
  }
  if (decision?.reasoningLevel === "lightweight") {
    return "advisory";
  }
  return base;
}

function buildExecutionOrder(
  mode: AiAgentCollaborationMode,
  primary: AiAgentCollaborationParticipant,
  supporting: readonly AiAgentCollaborationParticipant[],
): readonly string[] {
  const supportNames = supporting.map((agent) => agent.name);
  switch (mode) {
    case "solo":
      return Object.freeze([primary.name]);
    case "advisory":
    case "parallel-advisory":
      // Supporting agents advise first; primary returns the final response.
      return Object.freeze([...supportNames, primary.name]);
    case "sequential":
      // Primary leads; supporting agents assist in order.
      return Object.freeze([primary.name, ...supportNames]);
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function computeConfidence(input: ResolveAgentCollaborationInput): number {
  let score = 0.4;
  if (input.activeAgent) score += 0.25;
  if (input.agentDecision) score += 0.15;
  if (input.activeContext) score += 0.1;
  if (input.activeAgent && !input.activeAgent.fallback) score += 0.1;
  return clampConfidence(score);
}

/**
 * Resolve an immutable collaboration plan for the active (primary) agent.
 * Produces metadata only — does not execute agents or tools.
 */
export function resolveAgentCollaboration(
  input: ResolveAgentCollaborationInput,
): AiAgentCollaboration {
  const registry = input.registry ?? enterpriseAgentRegistry;
  const activeAgent = input.activeAgent;

  if (!activeAgent) {
    return Object.freeze({
      primaryAgent: Object.freeze({
        name: "Chat Agent",
        type: "chat" as const,
        role: "primary" as const,
      }),
      supportingAgents: Object.freeze([]),
      collaborationMode: "solo",
      collaborationReason: sanitizeReason(
        "No active agent; default solo collaboration",
      ),
      executionOrder: Object.freeze(["Chat Agent"]),
      sharedCapabilities: Object.freeze([]),
      confidence: clampConfidence(0.35),
    });
  }

  const primaryDefinition =
    registry.get(activeAgent.id) ??
    findEnabledByType(registry, activeAgent.type) ??
    null;

  const primary = toParticipant(
    {
      name: activeAgent.name || primaryDefinition?.name || "Agent",
      type: activeAgent.type,
    },
    "primary",
  );

  const rule =
    activeAgent.type !== "custom"
      ? BUILTIN_COLLABORATION_RULES[activeAgent.type]
      : null;

  const supportingType = rule?.supportingType ?? null;
  const supportingDefinition =
    supportingType != null
      ? findEnabledByType(registry, supportingType) ?? null
      : null;

  // Skip self-collaboration if supporting resolves to the same type/name.
  const supportingAgents =
    supportingDefinition &&
    supportingDefinition.type !== primary.type &&
    supportingDefinition.name !== primary.name
      ? Object.freeze([toParticipant(supportingDefinition, "supporting")])
      : Object.freeze([]);

  const collaborationMode = resolveMode(
    rule?.mode ?? "solo",
    input.agentDecision,
    supportingAgents.length > 0,
  );

  const reasonParts = [
    rule?.reason ?? "Custom agent solo collaboration",
    supportingAgents.length === 0
      ? "no supporting agents"
      : `supporting: ${supportingAgents.map((a) => a.name).join(", ")}`,
    input.agentDecision?.executionMode
      ? `decision mode: ${input.agentDecision.executionMode}`
      : null,
  ].filter((part): part is string => Boolean(part));

  const sharedCapabilities = capabilityLabels(
    activeAgent,
    primaryDefinition,
    supportingDefinition,
  );

  return Object.freeze({
    primaryAgent: primary,
    supportingAgents,
    collaborationMode,
    collaborationReason: sanitizeReason(reasonParts.join("; ")),
    executionOrder: buildExecutionOrder(
      collaborationMode,
      primary,
      supportingAgents,
    ),
    sharedCapabilities,
    confidence: computeConfidence(input),
  });
}
