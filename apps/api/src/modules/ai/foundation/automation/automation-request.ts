/**
 * Automation request — validated SAFE context only.
 * Never carries secrets, tokens, or raw business records.
 */

import type { AiAutomationProviderKind } from "./automation-provider-definition.js";

export type AiAutomationExecutionMode =
  | "sync"
  | "async"
  | "background"
  | "callback";

export interface AiAutomationValidatedContext {
  readonly actionId: string | null;
  readonly actionCategory: string | null;
  readonly actionPlanId: string | null;
  readonly workflowPlanId: string | null;
  readonly actionExecutionId: string | null;
  readonly actionExecutionStatus: string | null;
  readonly priority: string | null;
  readonly riskLevel: string | null;
  readonly stepSummaries: readonly string[];
  readonly notes: readonly string[];
}

export interface AiAutomationRequest {
  readonly requestId: string;
  readonly providerId: string;
  readonly providerKind: AiAutomationProviderKind;
  readonly workflowKey: string;
  readonly mode: AiAutomationExecutionMode;
  readonly context: AiAutomationValidatedContext;
  readonly timeoutMs: number;
  readonly cancelable: boolean;
  readonly requestedAt: string;
}

function sanitize(value: string, max = 80): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildValidatedAutomationContext(input: {
  readonly actionId?: string | null;
  readonly actionCategory?: string | null;
  readonly actionPlanId?: string | null;
  readonly workflowPlanId?: string | null;
  readonly actionExecutionId?: string | null;
  readonly actionExecutionStatus?: string | null;
  readonly priority?: string | null;
  readonly riskLevel?: string | null;
  readonly stepSummaries?: readonly string[];
  readonly notes?: readonly string[];
}): AiAutomationValidatedContext {
  return Object.freeze({
    actionId: input.actionId ?? null,
    actionCategory: input.actionCategory ?? null,
    actionPlanId: input.actionPlanId ?? null,
    workflowPlanId: input.workflowPlanId ?? null,
    actionExecutionId: input.actionExecutionId ?? null,
    actionExecutionStatus: input.actionExecutionStatus ?? null,
    priority: input.priority ?? null,
    riskLevel: input.riskLevel ?? null,
    stepSummaries: Object.freeze(
      (input.stepSummaries ?? [])
        .map((s) => sanitize(s, 60))
        .filter(Boolean)
        .slice(0, 8),
    ),
    notes: Object.freeze(
      (input.notes ?? [])
        .map((n) => sanitize(n, 60))
        .filter(Boolean)
        .slice(0, 8),
    ),
  });
}
