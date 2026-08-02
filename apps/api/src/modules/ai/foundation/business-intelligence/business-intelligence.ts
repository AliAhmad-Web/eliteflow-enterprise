/**
 * Immutable Enterprise Business Intelligence model.
 * Aggregated BI from existing runtime signals — never executes.
 */

import type { AiBiKpi } from "./business-kpis.js";
import type { AiBiMetric } from "./business-metrics.js";
import type { AiBiTrend } from "./business-trends.js";
import type { AiBiInsight } from "./business-insights.js";
import type { AiBiForecast } from "./business-forecast.js";
import type { AiBiHealth } from "./business-health.js";
import type { AiBiOpportunity } from "./business-opportunities.js";
import type { AiBiAlert } from "./business-alerts.js";

/**
 * Frozen business intelligence attached to pipeline state.
 * Safe interpretive fields only — never carries raw records or secrets.
 */
export interface AiBusinessIntelligence {
  readonly kpis: readonly AiBiKpi[];
  readonly metrics: readonly AiBiMetric[];
  readonly trends: readonly AiBiTrend[];
  readonly insights: readonly AiBiInsight[];
  readonly forecast: AiBiForecast;
  readonly health: AiBiHealth;
  readonly opportunities: readonly AiBiOpportunity[];
  readonly alerts: readonly AiBiAlert[];
  readonly overallScore: number;
  readonly summary: string;
  readonly confidence: number;
  readonly notes: readonly string[];
}
