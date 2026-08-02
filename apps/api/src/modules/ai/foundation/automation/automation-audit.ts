/**
 * Automation audit trail — SAFE events only.
 * Controlled by AI_AUTOMATION_AUDIT.
 */

import type { AiAutomationStatus } from "./automation-status.js";

export type AiAutomationAuditEventType =
  | "requested"
  | "provider_selected"
  | "triggered"
  | "succeeded"
  | "failed"
  | "skipped"
  | "blocked"
  | "retried"
  | "cancelled"
  | "timeout"
  | "callback_pending"
  | "completed";

export interface AiAutomationAuditEvent {
  readonly event: AiAutomationAuditEventType;
  readonly timestamp: string;
  readonly status?: string;
  readonly detail?: string;
}

export interface AiAutomationAuditRecord {
  readonly executionId: string;
  readonly providerId: string | null;
  readonly userId: string | null;
  readonly status: AiAutomationStatus;
  readonly events: readonly AiAutomationAuditEvent[];
  readonly generatedAt: string;
}

function sanitize(value: string, max = 80): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildAutomationAuditRecord(input: {
  readonly enabled: boolean;
  readonly executionId: string;
  readonly providerId: string | null;
  readonly userId: string | null;
  readonly status: AiAutomationStatus;
  readonly summary: string;
  readonly extraEvents?: readonly AiAutomationAuditEvent[];
}): AiAutomationAuditRecord | null {
  if (!input.enabled) return null;

  const events: AiAutomationAuditEvent[] = [
    Object.freeze({
      event: "requested" as const,
      timestamp: new Date().toISOString(),
      detail: sanitize("automation requested"),
    }),
    ...(input.extraEvents ?? []),
    Object.freeze({
      event: "completed" as const,
      timestamp: new Date().toISOString(),
      status: input.status,
      detail: sanitize(input.summary, 60),
    }),
  ];

  return Object.freeze({
    executionId: input.executionId,
    providerId: input.providerId,
    userId: input.userId,
    status: input.status,
    events: Object.freeze(events.slice(0, 24)),
    generatedAt: new Date().toISOString(),
  });
}
