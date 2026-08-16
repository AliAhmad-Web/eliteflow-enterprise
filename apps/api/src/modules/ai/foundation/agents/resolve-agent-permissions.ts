/**
 * Agent Permission Resolver.
 * Validates and resolves immutable agent permission boundaries.
 * Never executes tools or agents; never mutates user messages.
 */

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiActiveAgent } from "./ai-agent.js";
import type { AiAgentDecision } from "./ai-agent-decision.js";
import type {
  AiAgentPermissions,
  AiAgentSecurityLevel,
} from "./ai-agent-permissions.js";
import {
  BUILTIN_PERMISSION_BOUNDARIES,
  DEFAULT_PERMISSION_BOUNDARY,
  ENTERPRISE_TOOL_LABELS,
  type AiAgentPermissionBoundary,
} from "./builtin-permission-boundaries.js";

export interface ResolveAgentPermissionsInput {
  readonly activeAgent?: AiActiveAgent | null;
  readonly activeContext?: AiActiveContext | null;
  readonly agentDecision?: AiAgentDecision | null;
}

function sanitizeReason(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, 160);
}

function uniqueLabels(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const label = raw.replace(/[\r\n\t]+/g, " ").trim().slice(0, 64);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

function tightenSecurity(level: AiAgentSecurityLevel): AiAgentSecurityLevel {
  switch (level) {
    case "enterprise":
      return "elevated";
    case "elevated":
      return "standard";
    case "standard":
      return "restricted";
    case "restricted":
      return "restricted";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

function elevateSecurity(level: AiAgentSecurityLevel): AiAgentSecurityLevel {
  switch (level) {
    case "restricted":
      return "standard";
    case "standard":
      return "elevated";
    case "elevated":
      return "enterprise";
    case "enterprise":
      return "enterprise";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

function applyDecisionConstraints(
  boundary: AiAgentPermissionBoundary,
  decision?: AiAgentDecision | null,
): AiAgentPermissionBoundary {
  if (!decision) return boundary;

  let allowedTools = [...boundary.allowedTools];
  let deniedTools = [...boundary.deniedTools];
  let allowedActions = [...boundary.allowedActions];
  let deniedActions = [...boundary.deniedActions];
  let securityLevel = boundary.securityLevel;

  if (
    decision.executionMode === "respond-only" ||
    decision.toolPreference === "none"
  ) {
    deniedTools = uniqueLabels([...deniedTools, ...allowedTools]);
    allowedTools = [];
    securityLevel = tightenSecurity(securityLevel);
  } else if (decision.toolPreference === "low") {
    allowedTools = allowedTools.slice(0, 1);
    deniedTools = uniqueLabels([
      ...deniedTools,
      ...ENTERPRISE_TOOL_LABELS.filter((tool) => !allowedTools.includes(tool)),
    ]);
  } else if (decision.toolPreference === "high") {
    securityLevel = elevateSecurity(securityLevel);
  }

  if (decision.reasoningLevel === "lightweight") {
    const lightweight = new Set(["respond", "clarify", "summarize"]);
    const kept = allowedActions.filter((action) => lightweight.has(action));
    deniedActions = uniqueLabels([
      ...deniedActions,
      ...allowedActions.filter((action) => !lightweight.has(action)),
    ]);
    allowedActions = kept;
  }

  // Finance export remains denied for all agents.
  deniedTools = uniqueLabels([...deniedTools, "Finance Export"]);
  allowedTools = allowedTools.filter((tool) => tool !== "Finance Export");

  return Object.freeze({
    allowedTools: Object.freeze(uniqueLabels(allowedTools)),
    deniedTools: Object.freeze(uniqueLabels(deniedTools)),
    allowedActions: Object.freeze(uniqueLabels(allowedActions)),
    deniedActions: Object.freeze(uniqueLabels(deniedActions)),
    allowedEntityTypes: boundary.allowedEntityTypes,
    deniedEntityTypes: boundary.deniedEntityTypes,
    securityLevel,
    reason: boundary.reason,
  });
}

function applyContextConstraints(
  boundary: AiAgentPermissionBoundary,
  activeContext?: AiActiveContext | null,
): AiAgentPermissionBoundary {
  if (!activeContext) return boundary;

  let allowedEntityTypes = [...boundary.allowedEntityTypes];
  let deniedEntityTypes = [...boundary.deniedEntityTypes];
  let securityLevel = boundary.securityLevel;

  const activeTypes = [
    ...(activeContext.primaryEntity
      ? [activeContext.primaryEntity.type.toLowerCase()]
      : []),
    ...activeContext.entities.map((entity) => entity.type.toLowerCase()),
  ];

  if (activeTypes.length > 0 && allowedEntityTypes.length > 0) {
    const intersection = allowedEntityTypes.filter((type) =>
      activeTypes.includes(type.toLowerCase()),
    );
    if (intersection.length > 0) {
      const dropped = allowedEntityTypes.filter(
        (type) => !intersection.includes(type),
      );
      allowedEntityTypes = intersection;
      deniedEntityTypes = uniqueLabels([...deniedEntityTypes, ...dropped]);
    }
  }

  if (activeContext.surface === "REPORTS") {
    securityLevel = elevateSecurity(securityLevel);
  }

  if (activeContext.surface === "CUSTOMER") {
    securityLevel = "restricted";
  }

  return Object.freeze({
    ...boundary,
    allowedEntityTypes: Object.freeze(uniqueLabels(allowedEntityTypes)),
    deniedEntityTypes: Object.freeze(uniqueLabels(deniedEntityTypes)),
    securityLevel,
  });
}

/**
 * Resolve immutable agent permissions for the active agent.
 * Validates boundaries only — does not execute tools or agents.
 */
export function resolveAgentPermissions(
  input: ResolveAgentPermissionsInput,
): AiAgentPermissions {
  const agentType = input.activeAgent?.type;
  const base =
    agentType && agentType !== "custom"
      ? BUILTIN_PERMISSION_BOUNDARIES[agentType]
      : DEFAULT_PERMISSION_BOUNDARY;

  const withDecision = applyDecisionConstraints(base, input.agentDecision);
  const resolved = applyContextConstraints(withDecision, input.activeContext);

  const reasonParts = [
    resolved.reason,
    input.activeAgent?.name
      ? `primary: ${input.activeAgent.name
          .replace(/[\r\n\t]+/g, " ")
          .trim()
          .slice(0, 40)}`
      : null,
    input.agentDecision?.executionMode
      ? `decision: ${input.agentDecision.executionMode}`
      : null,
    `security: ${resolved.securityLevel}`,
  ].filter((part): part is string => Boolean(part));

  return Object.freeze({
    allowedTools: resolved.allowedTools,
    deniedTools: resolved.deniedTools,
    allowedActions: resolved.allowedActions,
    deniedActions: resolved.deniedActions,
    allowedEntityTypes: resolved.allowedEntityTypes,
    deniedEntityTypes: resolved.deniedEntityTypes,
    securityLevel: resolved.securityLevel,
    permissionReason: sanitizeReason(reasonParts.join("; ")),
  });
}
