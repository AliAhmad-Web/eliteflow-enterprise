/**
 * Enterprise Agent Analytics Engine.
 * Builds immutable runtime analytics from agent + tool pipeline state.
 * Never executes agents or tools; never mutates prompts or history.
 */

import type { AiActiveAgent } from "./ai-agent.js";
import type { AiAgentDecision } from "./ai-agent-decision.js";
import type { AiAgentCollaboration } from "./ai-agent-collaboration.js";
import type { AiAgentPermissions } from "./ai-agent-permissions.js";
import type {
  AiAgentAnalytics,
  AiAgentAnalyticsMetrics,
  AiAgentAnalyticsParticipant,
} from "./ai-agent-analytics.js";
import type { AiToolExecution } from "../contracts/ai-tool-execution.js";
import type { AiToolExecutionPlan } from "../tools/tool-execution-planner.js";

export interface BuildAgentAnalyticsInput {
  readonly activeAgent?: AiActiveAgent | null;
  readonly agentDecision?: AiAgentDecision | null;
  readonly agentCollaboration?: AiAgentCollaboration | null;
  readonly agentPermissions?: AiAgentPermissions | null;
  readonly toolExecutionPlan?: AiToolExecutionPlan | null;
  readonly toolExecutions?: readonly AiToolExecution[] | null;
  /** Fixed clock for deterministic tests; defaults to Date.now(). */
  readonly nowMs?: number;
}

function sanitizeLabel(value: string, max = 64): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function uniqueLabels(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const label = sanitizeLabel(raw);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return Object.freeze(out);
}

function toParticipant(
  name: string,
  type: string,
): AiAgentAnalyticsParticipant {
  return Object.freeze({
    name: sanitizeLabel(name, 40) || "Agent",
    type: sanitizeLabel(type, 24) || "custom",
  });
}

function collectToolStats(executions: readonly AiToolExecution[]): {
  selected: string[];
  executed: string[];
  skipped: string[];
  failed: string[];
  durationMs: number;
} {
  const selected: string[] = [];
  const executed: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];
  let durationMs = 0;

  for (const item of executions) {
    const toolId = sanitizeLabel(item.toolId, 64);
    if (!toolId) continue;

    switch (item.status) {
      case "eligible":
      case "pending_confirmation":
      case "running":
        selected.push(toolId);
        break;
      case "succeeded":
        selected.push(toolId);
        executed.push(toolId);
        break;
      case "skipped":
        skipped.push(toolId);
        break;
      case "failed":
        selected.push(toolId);
        failed.push(toolId);
        break;
      default: {
        const _exhaustive: never = item.status;
        void _exhaustive;
        break;
      }
    }

    if (
      typeof item.executionTimeMs === "number" &&
      Number.isFinite(item.executionTimeMs) &&
      item.executionTimeMs > 0
    ) {
      durationMs += item.executionTimeMs;
    }
  }

  return { selected, executed, skipped, failed, durationMs };
}

function selectedFromPlan(
  plan: AiToolExecutionPlan | null | undefined,
): string[] {
  if (!plan) return [];
  return plan.nodes
    .filter((node) => !node.skipped)
    .map((node) => sanitizeLabel(node.toolId, 64))
    .filter((id) => id.length > 0);
}

function buildWarnings(input: {
  readonly failedTools: readonly string[];
  readonly plan?: AiToolExecutionPlan | null;
  readonly activeAgent?: AiActiveAgent | null;
  readonly agentPermissions?: AiAgentPermissions | null;
}): readonly string[] {
  const warnings: string[] = [];

  if (input.failedTools.length > 0) {
    warnings.push(`failed_tools:${input.failedTools.length}`);
  }
  if (input.plan?.circularToolIds?.length) {
    warnings.push("circular_tool_dependencies");
  }
  if (input.activeAgent?.fallback) {
    warnings.push("fallback_agent");
  }
  if (input.agentPermissions?.securityLevel === "restricted") {
    warnings.push("restricted_security_level");
  }

  return Object.freeze(warnings);
}

function buildMetrics(input: {
  readonly selectedCount: number;
  readonly executedCount: number;
  readonly skippedCount: number;
  readonly failedCount: number;
  readonly supportingAgentCount: number;
  readonly plannedWaveCount: number;
  readonly allowedToolBoundaryCount: number;
}): AiAgentAnalyticsMetrics {
  return Object.freeze({
    toolCount: input.selectedCount,
    executedCount: input.executedCount,
    skippedCount: input.skippedCount,
    failedCount: input.failedCount,
    supportingAgentCount: input.supportingAgentCount,
    plannedWaveCount: input.plannedWaveCount,
    allowedToolBoundaryCount: input.allowedToolBoundaryCount,
  });
}

/**
 * Build immutable agent analytics for the current pipeline state.
 */
export function buildAgentAnalytics(
  input: BuildAgentAnalyticsInput,
): AiAgentAnalytics {
  const nowMs = input.nowMs ?? Date.now();
  const executions = input.toolExecutions ?? [];
  const toolStats = collectToolStats(executions);

  const plannedSelected = selectedFromPlan(input.toolExecutionPlan);
  const selectedTools = uniqueLabels(
    plannedSelected.length > 0
      ? [...plannedSelected, ...toolStats.selected]
      : toolStats.selected,
  );
  const executedTools = uniqueLabels(toolStats.executed);
  const skippedTools = uniqueLabels(toolStats.skipped);
  const failedTools = uniqueLabels(toolStats.failed);

  // Reconstruct timing from tool durations + lightweight agent-stage overhead.
  const agentOverheadMs =
    (input.activeAgent ? 8 : 0) +
    (input.agentDecision ? 4 : 0) +
    (input.agentCollaboration ? 3 : 0) +
    (input.agentPermissions ? 3 : 0);
  const durationMs = Math.max(1, Math.round(toolStats.durationMs + agentOverheadMs));
  const executionEnd = new Date(nowMs).toISOString();
  const executionStart = new Date(nowMs - durationMs).toISOString();

  const activeAgent = input.activeAgent
    ? toParticipant(input.activeAgent.name, input.activeAgent.type)
    : input.agentCollaboration?.primaryAgent
      ? toParticipant(
          input.agentCollaboration.primaryAgent.name,
          input.agentCollaboration.primaryAgent.type,
        )
      : null;

  const supportingAgents = Object.freeze(
    (input.agentCollaboration?.supportingAgents ?? []).map((agent) =>
      toParticipant(agent.name, agent.type),
    ),
  );

  const warnings = buildWarnings({
    failedTools,
    plan: input.toolExecutionPlan,
    activeAgent: input.activeAgent,
    agentPermissions: input.agentPermissions,
  });

  const success = failedTools.length === 0;

  const metrics = buildMetrics({
    selectedCount: selectedTools.length,
    executedCount: executedTools.length,
    skippedCount: skippedTools.length,
    failedCount: failedTools.length,
    supportingAgentCount: supportingAgents.length,
    plannedWaveCount: input.toolExecutionPlan?.waves?.length ?? 0,
    allowedToolBoundaryCount:
      input.agentPermissions?.allowedTools?.length ?? 0,
  });

  return Object.freeze({
    activeAgent,
    supportingAgents,
    executionStart,
    executionEnd,
    durationMs,
    decisionConfidence:
      input.agentDecision?.confidenceScore != null
        ? input.agentDecision.confidenceScore
        : input.agentCollaboration?.confidence != null
          ? input.agentCollaboration.confidence
          : null,
    selectedTools,
    executedTools,
    skippedTools,
    securityLevel: input.agentPermissions?.securityLevel ?? null,
    reasoningLevel: input.agentDecision?.reasoningLevel ?? null,
    responseMode: input.agentDecision?.responseMode ?? null,
    collaborationMode: input.agentCollaboration?.collaborationMode ?? null,
    success,
    warnings,
    metrics,
  });
}

/**
 * Structured analytics log — single summary line, no console spam.
 * Never includes prompts, tokens, business payloads, or internal ids.
 * Never throws.
 */
export function emitAgentAnalyticsLog(analytics: AiAgentAnalytics): void {
  try {
    const payload = {
      event: "ai.agent.analytics",
      activeAgentType: analytics.activeAgent?.type ?? null,
      supportingAgentCount: analytics.metrics.supportingAgentCount,
      durationMs: analytics.durationMs,
      decisionConfidence: analytics.decisionConfidence,
      selectedToolCount: analytics.selectedTools.length,
      executedToolCount: analytics.executedTools.length,
      skippedToolCount: analytics.skippedTools.length,
      failedToolCount: analytics.metrics.failedCount,
      securityLevel: analytics.securityLevel,
      reasoningLevel: analytics.reasoningLevel,
      responseMode: analytics.responseMode,
      collaborationMode: analytics.collaborationMode,
      success: analytics.success,
      warningCount: analytics.warnings.length,
      metrics: analytics.metrics,
    };
    console.info("[ai:agent-analytics]", JSON.stringify(payload));
  } catch {
    // Observability must never break the pipeline.
  }
}
