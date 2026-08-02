/**
 * Immutable Enterprise Business Reasoning model.
 * Structured analysis over already-fetched module summaries — never executes.
 */

import type { AiBusinessInsight } from "./business-insights.js";
import type { AiBusinessRisk } from "./business-risks.js";
import type { AiBusinessRecommendation } from "./business-recommendations.js";
import type { AiBusinessPriority } from "./business-priorities.js";
import type { AiBusinessAnalysisItem } from "./business-analysis.js";

/**
 * Frozen reasoning attached to pipeline state.
 * Safe interpretive fields only — never carries raw records, emails, or secrets.
 */
export interface AiBusinessReasoning {
  readonly summary: string;
  readonly analysis: readonly AiBusinessAnalysisItem[];
  readonly insights: readonly AiBusinessInsight[];
  readonly risks: readonly AiBusinessRisk[];
  readonly priorities: readonly AiBusinessPriority[];
  readonly recommendations: readonly AiBusinessRecommendation[];
  readonly confidence: number;
  readonly notes: readonly string[];
}
