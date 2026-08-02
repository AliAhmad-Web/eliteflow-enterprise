/**
 * Business Intelligence insights — interpretive findings (BI package).
 */

export type AiBiInsightKind =
  | "operational"
  | "financial"
  | "risk"
  | "opportunity"
  | "general";

export interface AiBiInsight {
  readonly kind: AiBiInsightKind;
  readonly text: string;
}

export function formatBiInsightKind(kind: AiBiInsightKind): string {
  switch (kind) {
    case "operational":
      return "Operational";
    case "financial":
      return "Financial";
    case "risk":
      return "Risk";
    case "opportunity":
      return "Opportunity";
    case "general":
      return "General";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function buildBusinessIntelligenceInsights(input: {
  readonly reasoningInsightTexts: readonly string[];
  readonly riskTexts: readonly string[];
  readonly recommendationTexts: readonly string[];
  readonly queryModule: string | null;
}): readonly AiBiInsight[] {
  const insights: AiBiInsight[] = [];

  for (const text of input.reasoningInsightTexts.slice(0, 3)) {
    insights.push({
      kind: "operational",
      text: text.slice(0, 120),
    });
  }
  for (const text of input.riskTexts.slice(0, 2)) {
    insights.push({
      kind: "risk",
      text: text.slice(0, 120),
    });
  }
  for (const text of input.recommendationTexts.slice(0, 2)) {
    insights.push({
      kind: "opportunity",
      text: text.slice(0, 120),
    });
  }
  if (input.queryModule) {
    insights.push({
      kind: "general",
      text: `Primary focus module: ${input.queryModule}`.slice(0, 120),
    });
  }
  if (insights.length === 0) {
    insights.push({
      kind: "general",
      text: "Insufficient runtime signals for detailed insights",
    });
  }

  return Object.freeze(
    insights.slice(0, 8).map((item) => Object.freeze(item)),
  );
}
