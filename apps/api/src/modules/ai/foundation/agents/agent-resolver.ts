/**
 * Enterprise AI Agent Resolver.
 * Selects the active agent from registry + context. Never executes tools.
 * Never bypasses Policy / Context / Tool stages (resolution is post-tools).
 */

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiEffectivePolicy } from "../contracts/ai-effective-policy.js";
import {
  DEFAULT_CHAT_AGENT_ID,
  type AiActiveAgent,
  type AiAgentDefinition,
} from "./ai-agent.js";
import {
  enterpriseAgentRegistry,
  type AiAgentRegistry,
} from "./agent-registry.js";
import { CHAT_AGENT } from "./builtin-agents.js";

export interface ResolveActiveAgentInput {
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
  readonly mode?: string | null;
  /** Explicit agent id hint (optional). */
  readonly agentId?: string | null;
  readonly registry?: AiAgentRegistry;
}

function toActiveAgent(
  definition: AiAgentDefinition,
  resolutionReason: string,
  fallback: boolean,
): AiActiveAgent {
  return Object.freeze({
    id: definition.id,
    type: definition.type,
    name: definition.name,
    systemInstructions: definition.systemInstructions?.trim() ?? "",
    runtimeInstructions: definition.runtimeInstructions?.trim() ?? "",
    preferredTools: Object.freeze([...(definition.preferredTools ?? [])]),
    preferredProvider: definition.preferredProvider ?? null,
    preferredModel: definition.preferredModel ?? null,
    memoryPreferences: Object.freeze({
      ...(definition.memoryPreferences ?? {}),
    }),
    executionHints: Object.freeze({
      ...(definition.executionHints ?? {}),
    }),
    resolutionReason,
    fallback,
  });
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function scoreAgent(
  agent: AiAgentDefinition,
  mode: string,
  moduleKey: string,
  surface: string,
): { score: number; reasons: string[] } {
  let score = agent.executionHints?.priority ?? 0;
  const reasons: string[] = [];

  if (agent.modes && agent.modes.length > 0) {
    const modes = agent.modes.map((item) => item.toUpperCase());
    if (mode && modes.includes(mode)) {
      score += 20;
      reasons.push("mode");
    } else if (mode) {
      // Mode-bound agent that does not match — heavily demote
      score -= 50;
    }
  }

  if (agent.modules && agent.modules.length > 0 && moduleKey) {
    if (agent.modules.map((m) => m.toLowerCase()).includes(moduleKey.toLowerCase())) {
      score += 8;
      reasons.push("module");
    }
  }

  if (agent.surfaces && agent.surfaces.length > 0 && surface) {
    if (agent.surfaces.map((s) => s.toUpperCase()).includes(surface)) {
      score += 6;
      reasons.push("surface");
    }
  }

  return { score, reasons };
}

/**
 * Resolve the active agent for this request.
 * Falls back to the default Chat Agent when no match exists.
 */
export function resolveActiveAgent(
  input: ResolveActiveAgentInput,
): AiActiveAgent {
  const registry = input.registry ?? enterpriseAgentRegistry;
  const enabled = registry.listEnabled();
  const mode = normalize(input.mode ?? input.activeContext.mode);
  const moduleKey = (input.activeContext.module ?? "").trim();
  const surface = normalize(input.activeContext.surface);

  // Privacy mode still resolves an agent (chat fallback) — does not bypass policy.
  const explicitId = input.agentId?.trim();
  if (explicitId) {
    const explicit = registry.get(explicitId);
    if (explicit && explicit.enabled !== false) {
      return toActiveAgent(
        explicit,
        `explicit:${explicit.id}`,
        explicit.id === DEFAULT_CHAT_AGENT_ID,
      );
    }
  }

  let best: { agent: AiAgentDefinition; score: number; reasons: string[] } | null =
    null;

  for (const agent of enabled) {
    if (agent.id === DEFAULT_CHAT_AGENT_ID) {
      continue; // scored only as fallback
    }
    const { score, reasons } = scoreAgent(agent, mode, moduleKey, surface);
    if (score <= 0) continue;
    if (
      !best ||
      score > best.score ||
      (score === best.score && agent.id.localeCompare(best.agent.id) < 0)
    ) {
      best = { agent, score, reasons };
    }
  }

  if (best) {
    return toActiveAgent(
      best.agent,
      `matched:${best.reasons.join("+") || "priority"}:${best.score}`,
      false,
    );
  }

  const chat =
    registry.get(DEFAULT_CHAT_AGENT_ID) ??
    enabled.find((agent) => agent.type === "chat") ??
    CHAT_AGENT;

  return toActiveAgent(chat, "fallback:chat", true);
}
