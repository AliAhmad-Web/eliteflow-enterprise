/**
 * Business Intelligence overall score helpers.
 */

import type { AiBiKpi } from "./business-kpis.js";

export function computeOverallBiScore(kpis: readonly AiBiKpi[]): number {
  if (kpis.length === 0) return 50;
  const total = kpis.reduce((sum, kpi) => sum + kpi.score, 0);
  return Math.min(100, Math.max(0, Math.round(total / kpis.length)));
}
