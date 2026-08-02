/**
 * Format Business Intelligence as safe Runtime Instructions metadata.
 * Never exposes raw business data, records, or secrets.
 */

import type { AiBusinessIntelligence } from "./business-intelligence.js";
import { formatBiHealthLevel } from "./business-health.js";
import { formatBiTrendDirection } from "./business-trends.js";
import { formatBiForecastOutlook } from "./business-forecast.js";
import { formatBiAlertSeverity } from "./business-alerts.js";

function sanitizeLine(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only business intelligence metadata for the Runtime section.
 */
export function formatBusinessIntelligenceForRuntime(
  intelligence: AiBusinessIntelligence | null | undefined,
): string {
  if (!intelligence) return "";

  const overallTrend =
    intelligence.trends.find((t) => t.id === "trend.overall")?.direction ??
    "unknown";

  const lines: string[] = [
    "Business Intelligence:",
    `Business Health: ${formatBiHealthLevel(intelligence.health.level)}`,
    `Overall KPI Score: ${intelligence.overallScore}`,
    `Trend: ${formatBiTrendDirection(overallTrend)}`,
    `Forecast: ${formatBiForecastOutlook(intelligence.forecast.outlook)} — ${sanitizeLine(intelligence.forecast.summary, 100)}`,
    `Confidence: ${intelligence.confidence.toFixed(2)}`,
  ];

  const topOpps = intelligence.opportunities.slice(0, 3);
  if (topOpps.length > 0) {
    lines.push("Top Opportunities:");
    for (const opp of topOpps) {
      lines.push(`- ${sanitizeLine(opp.text, 100)}`);
    }
  }

  const criticalAlerts = intelligence.alerts.filter(
    (a) => a.severity === "critical" || a.severity === "warning",
  );
  if (criticalAlerts.length > 0) {
    lines.push("Critical Alerts:");
    for (const alert of criticalAlerts.slice(0, 3)) {
      lines.push(
        `- [${formatBiAlertSeverity(alert.severity)}] ${sanitizeLine(alert.text, 100)}`,
      );
    }
  }

  return lines.join("\n").trim();
}
