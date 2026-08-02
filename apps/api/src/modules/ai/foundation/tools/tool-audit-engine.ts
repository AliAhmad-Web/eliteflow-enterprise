/**
 * Enterprise Tool Audit & Observability Engine.
 * Reconstructs lifecycle events and immutable audit records from pipeline state.
 * Never includes sensitive tool outputs. Never interrupts the pipeline.
 */

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiEffectivePolicy } from "../contracts/ai-effective-policy.js";
import type {
  AiToolExecution,
  AiToolId,
} from "../contracts/ai-tool-execution.js";
import type { AiToolDefinition } from "./tool-catalog.js";
import type { AiToolExecutionPlan } from "./tool-execution-planner.js";
import type { AiToolRoutingDecision } from "./tool-routing-engine.js";
import type { AiToolSelectionResult } from "./tool-selection-engine.js";
import type { AiValidatedToolResults } from "./tool-result-validation.js";

export type AiToolLifecycleEventType =
  | "discovered"
  | "eligible"
  | "selected"
  | "planned"
  | "started"
  | "completed"
  | "skipped"
  | "failed"
  | "timeout";

export interface AiToolLifecycleEvent {
  readonly event: AiToolLifecycleEventType;
  readonly toolId: AiToolId;
  readonly executionId: string;
  readonly timestamp: string;
  readonly status?: string;
  readonly durationMs?: number;
  readonly confidence?: number;
}

export interface AiToolAuditRecord {
  readonly executionId: string;
  readonly toolId: AiToolId;
  readonly userId: string | null;
  readonly organizationId: string | null;
  readonly conversationId: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly durationMs: number | null;
  readonly status: string;
  readonly confidence: number | null;
  readonly events: readonly AiToolLifecycleEvent[];
  /** Non-sensitive skip / failure code only — never raw outputs. */
  readonly outcomeCode?: string;
}

export interface AiToolAuditStatistics {
  readonly discovered: number;
  readonly eligible: number;
  readonly selected: number;
  readonly planned: number;
  readonly started: number;
  readonly completed: number;
  readonly skipped: number;
  readonly failed: number;
  readonly timeout: number;
  readonly totalDurationMs: number;
  readonly recordCount: number;
}

export interface AiToolAuditSummary {
  readonly requestId: string;
  readonly records: readonly AiToolAuditRecord[];
  readonly events: readonly AiToolLifecycleEvent[];
  readonly statistics: AiToolAuditStatistics;
  readonly generatedAt: string;
  readonly privacyMode: boolean;
}

export interface BuildToolAuditSummaryInput {
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
  readonly userId?: string | null;
  readonly discoveredTools?: readonly AiToolDefinition[];
  readonly toolExecutions: readonly AiToolExecution[];
  readonly toolRoutingDecision?: AiToolRoutingDecision;
  readonly toolSelectionResult?: AiToolSelectionResult;
  readonly toolExecutionPlan?: AiToolExecutionPlan;
  readonly validatedToolResults?: AiValidatedToolResults;
  /** Fixed clock for deterministic tests; defaults to Date.now(). */
  readonly nowMs?: number;
}

function isoFromOffset(baseMs: number, offsetMs: number): string {
  return new Date(baseMs + offsetMs).toISOString();
}

function resolveOrganizationId(context: AiActiveContext): string | null {
  return (
    context.organization?.organizationId ??
    context.organization?.organizationKey ??
    null
  );
}

function buildRequestId(
  userId: string | null,
  organizationId: string | null,
  conversationId: string | null,
): string {
  return [
    "req",
    organizationId ?? "no-org",
    userId ?? "anon",
    conversationId ?? "no-conv",
  ].join(":");
}

function buildExecutionId(
  requestId: string,
  toolId: AiToolId,
  ordinal: number,
): string {
  return `${requestId}:tool:${ordinal}:${toolId}`;
}

function resolveConfidence(
  toolId: AiToolId,
  selection?: AiToolSelectionResult,
  execution?: AiToolExecution,
): number | null {
  const decision = selection?.decisions.find((item) => item.toolId === toolId);
  if (decision && typeof decision.confidence === "number") {
    return decision.confidence;
  }
  const meta = execution?.metadata?.confidence;
  if (typeof meta === "number" && Number.isFinite(meta)) {
    return meta;
  }
  return null;
}

function isTimedOut(execution: AiToolExecution): boolean {
  return execution.metadata?.timedOut === true;
}

function sanitizeOutcomeCode(execution: AiToolExecution): string | undefined {
  if (execution.status === "skipped") {
    const reason =
      (typeof execution.metadata?.skipReason === "string"
        ? execution.metadata.skipReason
        : null) ||
      execution.error ||
      execution.errorMessage;
    if (!reason) return "skipped";
    // Keep code-like tokens only; drop free-text that may contain PII.
    const code = reason.split(":")[0]?.trim() || "skipped";
    return code.slice(0, 64);
  }
  if (execution.status === "failed") {
    return isTimedOut(execution) ? "timeout" : "failed";
  }
  if (execution.status === "succeeded") {
    return "completed";
  }
  return execution.status;
}

function pushEvent(
  events: AiToolLifecycleEvent[],
  event: AiToolLifecycleEvent,
): void {
  events.push(Object.freeze(event));
}

/**
 * Build an immutable tool audit summary from pipeline state.
 * Excludes sensitive outputs/inputs. Safe to call inside try/catch.
 */
export function buildToolAuditSummary(
  input: BuildToolAuditSummaryInput,
): AiToolAuditSummary {
  const nowMs = input.nowMs ?? Date.now();
  const privacyMode = input.policy.privacyMode === true;
  const userId =
    input.userId ?? input.activeContext.user?.userId ?? null;
  const organizationId = resolveOrganizationId(input.activeContext);
  const conversationId = input.activeContext.conversationId;
  const requestId = buildRequestId(userId, organizationId, conversationId);

  // Privacy mode: omit user identifiers from audit records when privacy is on.
  const auditUserId = privacyMode ? null : userId;
  const auditOrgId = privacyMode ? null : organizationId;
  const auditConversationId = privacyMode ? null : conversationId;

  const allEvents: AiToolLifecycleEvent[] = [];
  const records: AiToolAuditRecord[] = [];

  const discoveredIds = (input.discoveredTools ?? []).map((tool) => tool.id);
  const discoveredSet = new Set(discoveredIds);

  const eligibleIds = input.toolExecutions.map((item) => item.toolId);
  const eligibleSet = new Set(eligibleIds);

  const selectedIds = new Set<AiToolId>();
  if (input.toolSelectionResult?.selectedTools) {
    for (const tool of input.toolSelectionResult.selectedTools) {
      selectedIds.add(tool.toolId);
    }
  } else if (input.toolRoutingDecision?.selectedTools) {
    for (const tool of input.toolRoutingDecision.selectedTools) {
      selectedIds.add(tool.toolId);
    }
  }

  const plannedIds = new Set<AiToolId>();
  if (input.toolExecutionPlan) {
    for (const node of input.toolExecutionPlan.nodes) {
      if (!node.skipped) plannedIds.add(node.toolId);
    }
    for (const wave of input.toolExecutionPlan.waves) {
      for (const toolId of wave) plannedIds.add(toolId);
    }
  }

  // Deterministic ordinal map across all known tool ids
  const orderedToolIds: AiToolId[] = [];
  const seen = new Set<AiToolId>();
  for (const id of [
    ...discoveredIds,
    ...eligibleIds,
    ...selectedIds,
    ...plannedIds,
  ]) {
    if (seen.has(id)) continue;
    seen.add(id);
    orderedToolIds.push(id);
  }

  const executionById = new Map(
    input.toolExecutions.map((item) => [item.toolId, item]),
  );

  let eventOffset = 0;

  for (let ordinal = 0; ordinal < orderedToolIds.length; ordinal += 1) {
    const toolId = orderedToolIds[ordinal]!;
    const executionId = buildExecutionId(requestId, toolId, ordinal);
    const execution = executionById.get(toolId);
    const confidence = resolveConfidence(
      toolId,
      input.toolSelectionResult,
      execution,
    );
    const recordEvents: AiToolLifecycleEvent[] = [];

    if (discoveredSet.has(toolId) || eligibleSet.has(toolId)) {
      const ev: AiToolLifecycleEvent = {
        event: "discovered",
        toolId,
        executionId,
        timestamp: isoFromOffset(nowMs, eventOffset++),
        status: "discovered",
      };
      pushEvent(recordEvents, ev);
      pushEvent(allEvents, ev);
    }

    if (eligibleSet.has(toolId)) {
      const ev: AiToolLifecycleEvent = {
        event: "eligible",
        toolId,
        executionId,
        timestamp: isoFromOffset(nowMs, eventOffset++),
        status: "eligible",
        confidence: confidence ?? undefined,
      };
      pushEvent(recordEvents, ev);
      pushEvent(allEvents, ev);
    }

    if (selectedIds.has(toolId)) {
      const ev: AiToolLifecycleEvent = {
        event: "selected",
        toolId,
        executionId,
        timestamp: isoFromOffset(nowMs, eventOffset++),
        status: "selected",
        confidence: confidence ?? undefined,
      };
      pushEvent(recordEvents, ev);
      pushEvent(allEvents, ev);
    }

    if (plannedIds.has(toolId)) {
      const ev: AiToolLifecycleEvent = {
        event: "planned",
        toolId,
        executionId,
        timestamp: isoFromOffset(nowMs, eventOffset++),
        status: "planned",
        confidence: confidence ?? undefined,
      };
      pushEvent(recordEvents, ev);
      pushEvent(allEvents, ev);
    }

    let startedAt: string | null = null;
    let completedAt: string | null = null;
    let durationMs: number | null = null;
    let status = execution?.status ?? "unknown";

    if (execution) {
      const ran =
        execution.status === "succeeded" ||
        execution.status === "failed" ||
        (execution.status === "skipped" &&
          Boolean(execution.executionTimeMs));

      // Started for tools that attempted execution (succeeded/failed/timeout)
      if (
        execution.status === "succeeded" ||
        execution.status === "failed"
      ) {
        startedAt = isoFromOffset(nowMs, eventOffset);
        const startEv: AiToolLifecycleEvent = {
          event: "started",
          toolId,
          executionId,
          timestamp: startedAt,
          status: "started",
        };
        eventOffset += 1;
        pushEvent(recordEvents, startEv);
        pushEvent(allEvents, startEv);

        durationMs =
          typeof execution.executionTimeMs === "number"
            ? execution.executionTimeMs
            : null;
        completedAt = isoFromOffset(
          nowMs,
          eventOffset + (durationMs ?? 0),
        );

        if (isTimedOut(execution)) {
          status = "timeout";
          const timeoutEv: AiToolLifecycleEvent = {
            event: "timeout",
            toolId,
            executionId,
            timestamp: completedAt,
            status: "timeout",
            durationMs: durationMs ?? undefined,
          };
          eventOffset += 1;
          pushEvent(recordEvents, timeoutEv);
          pushEvent(allEvents, timeoutEv);
        } else if (execution.status === "succeeded") {
          status = "completed";
          const doneEv: AiToolLifecycleEvent = {
            event: "completed",
            toolId,
            executionId,
            timestamp: completedAt,
            status: "completed",
            durationMs: durationMs ?? undefined,
            confidence: confidence ?? undefined,
          };
          eventOffset += 1;
          pushEvent(recordEvents, doneEv);
          pushEvent(allEvents, doneEv);
        } else {
          status = "failed";
          const failEv: AiToolLifecycleEvent = {
            event: "failed",
            toolId,
            executionId,
            timestamp: completedAt,
            status: "failed",
            durationMs: durationMs ?? undefined,
          };
          eventOffset += 1;
          pushEvent(recordEvents, failEv);
          pushEvent(allEvents, failEv);
        }
      } else if (execution.status === "skipped") {
        status = "skipped";
        completedAt = isoFromOffset(nowMs, eventOffset);
        const skipEv: AiToolLifecycleEvent = {
          event: "skipped",
          toolId,
          executionId,
          timestamp: completedAt,
          status: "skipped",
        };
        eventOffset += 1;
        pushEvent(recordEvents, skipEv);
        pushEvent(allEvents, skipEv);
      }

      void ran;
    }

    const validationReject = input.validatedToolResults?.rejected.find(
      (item) => item.toolId === toolId,
    );

    const outcomeCode = (() => {
      if (validationReject?.rejectionReason) {
        return validationReject.rejectionReason.split(":")[0]?.slice(0, 64);
      }
      return sanitizeOutcomeCode(
        execution ?? {
          toolId,
          status: (status as AiToolExecution["status"]) || "skipped",
        },
      );
    })();

    records.push(
      Object.freeze({
        executionId,
        toolId,
        userId: auditUserId,
        organizationId: auditOrgId,
        conversationId: auditConversationId,
        startedAt,
        completedAt,
        durationMs,
        status,
        confidence,
        events: Object.freeze(recordEvents),
        outcomeCode,
      }),
    );
  }

  const statistics: AiToolAuditStatistics = Object.freeze({
    discovered: allEvents.filter((e) => e.event === "discovered").length,
    eligible: allEvents.filter((e) => e.event === "eligible").length,
    selected: allEvents.filter((e) => e.event === "selected").length,
    planned: allEvents.filter((e) => e.event === "planned").length,
    started: allEvents.filter((e) => e.event === "started").length,
    completed: allEvents.filter((e) => e.event === "completed").length,
    skipped: allEvents.filter((e) => e.event === "skipped").length,
    failed: allEvents.filter((e) => e.event === "failed").length,
    timeout: allEvents.filter((e) => e.event === "timeout").length,
    totalDurationMs: records.reduce(
      (sum, record) => sum + (record.durationMs ?? 0),
      0,
    ),
    recordCount: records.length,
  });

  return Object.freeze({
    requestId: privacyMode
      ? buildRequestId(null, null, null)
      : requestId,
    records: Object.freeze(records),
    events: Object.freeze(allEvents),
    statistics,
    generatedAt: isoFromOffset(nowMs, eventOffset),
    privacyMode,
  });
}

/**
 * Structured observability log — single summary line, no console spam.
 * Never throws.
 */
export function emitToolObservabilityLog(
  summary: AiToolAuditSummary,
): void {
  try {
    const payload = {
      requestId: summary.requestId,
      privacyMode: summary.privacyMode,
      statistics: summary.statistics,
      tools: summary.records.map((record) => ({
        toolId: record.toolId,
        executionId: record.executionId,
        status: record.status,
        durationMs: record.durationMs,
        confidence: record.confidence,
        outcomeCode: record.outcomeCode,
      })),
    };
    console.info("[ai:tool-observability]", JSON.stringify(payload));
  } catch {
    // Observability must never break the pipeline.
  }
}
