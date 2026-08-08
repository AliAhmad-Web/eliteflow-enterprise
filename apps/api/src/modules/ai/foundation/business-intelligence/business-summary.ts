/**
 * Business Intelligence executive summary.
 */

import type { AiBiHealthLevel } from "./business-health.js";
import { formatBiHealthLevel } from "./business-health.js";
import type { AiBiForecastOutlook } from "./business-forecast.js";
import { formatBiForecastOutlook } from "./business-forecast.js";
import type { AiBiTrendDirection } from "./business-trends.js";
import { formatBiTrendDirection } from "./business-trends.js";
import { aiDataPolicyService } from "../policy/ai-data-policy.service.js";

export function buildBusinessIntelligenceSummary(input: {
  readonly healthLevel: AiBiHealthLevel;
  readonly overallScore: number;
  readonly trendDirection: AiBiTrendDirection;
  readonly forecastOutlook: AiBiForecastOutlook;
  readonly alertCount: number;
  readonly opportunityCount: number;
}): string {
  const raw =
    [
      `Health ${formatBiHealthLevel(input.healthLevel)}`,
      `KPI ${input.overallScore}`,
      `Trend ${formatBiTrendDirection(input.trendDirection)}`,
      `Forecast ${formatBiForecastOutlook(input.forecastOutlook)}`,
      `${input.alertCount} alert${input.alertCount === 1 ? "" : "s"}`,
      `${input.opportunityCount} opportunit${input.opportunityCount === 1 ? "y" : "ies"}`,
    ].join("; ") + ".";

  return aiDataPolicyService.sanitizeSummary(
    raw,
    aiDataPolicyService.subjectFrom({ role: "EMPLOYEE" }),
  );
}
