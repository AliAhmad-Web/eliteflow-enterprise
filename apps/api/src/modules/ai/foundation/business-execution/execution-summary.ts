/**
 * Execution summary helpers and shared text sanitize.
 */

import type { AiBusinessExecutionHorizon } from "./execution-timeline.js";
import { formatExecutionHorizon } from "./execution-timeline.js";

export function sanitizeExecutionText(value: string, max = 160): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildExecutionSummary(input: {
  readonly phaseCount: number;
  readonly milestoneCount: number;
  readonly horizon: AiBusinessExecutionHorizon;
  readonly recommendationCount: number;
  readonly topRecommendation?: string | null;
}): string {
  const focus = input.topRecommendation?.trim().slice(0, 80) ?? "";
  const base = [
    `${input.phaseCount} phase${input.phaseCount === 1 ? "" : "s"}`,
    `${input.milestoneCount} milestone${input.milestoneCount === 1 ? "" : "s"}`,
    formatExecutionHorizon(input.horizon),
    `${input.recommendationCount} recommendation${input.recommendationCount === 1 ? "" : "s"}`,
  ].join("; ");
  return focus ? `${base}. Focus: ${focus}` : `${base}.`;
}
