/**
 * Business Intelligence opportunities — actionable upside signals.
 */

export interface AiBiOpportunity {
  readonly id: string;
  readonly text: string;
  readonly priority: "low" | "medium" | "high";
}

export function buildBusinessOpportunities(input: {
  readonly recommendationTexts: readonly string[];
  readonly unreadSignal: boolean;
  readonly overdueSignal: boolean;
  readonly executableWorkflow: boolean;
}): readonly AiBiOpportunity[] {
  const opportunities: AiBiOpportunity[] = [];

  if (input.overdueSignal) {
    opportunities.push({
      id: "opp.clear-overdue",
      text: "Clear overdue work to improve operational KPIs",
      priority: "high",
    });
  }
  if (input.unreadSignal) {
    opportunities.push({
      id: "opp.review-docs",
      text: "Review unread documents to reduce attention load",
      priority: "medium",
    });
  }
  if (input.executableWorkflow) {
    opportunities.push({
      id: "opp.execute-workflow",
      text: "Execute planned workflow via tool stages when permitted",
      priority: "medium",
    });
  }
  for (const [index, text] of input.recommendationTexts
    .slice(0, 2)
    .entries()) {
    opportunities.push({
      id: `opp.rec.${index + 1}`,
      text: text.slice(0, 120),
      priority: "medium",
    });
  }
  if (opportunities.length === 0) {
    opportunities.push({
      id: "opp.monitor",
      text: "Continue monitoring — no strong upside signal detected",
      priority: "low",
    });
  }

  return Object.freeze(
    opportunities.slice(0, 5).map((item) => Object.freeze(item)),
  );
}
