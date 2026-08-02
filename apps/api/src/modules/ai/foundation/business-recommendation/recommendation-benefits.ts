/**
 * Recommendation benefits — expected upside summaries.
 */

export interface AiBusinessRecommendationBenefit {
  readonly id: string;
  readonly text: string;
}

export function buildRecommendationBenefits(input: {
  readonly healthLevel: string | null;
  readonly overallScore: number;
  readonly opportunityTexts: readonly string[];
}): readonly AiBusinessRecommendationBenefit[] {
  const benefits: AiBusinessRecommendationBenefit[] = [];

  if (input.overallScore < 70) {
    benefits.push({
      id: "benefit.kpi",
      text: "Improve overall KPI posture through focused follow-up",
    });
  }
  if (input.healthLevel === "at-risk" || input.healthLevel === "critical") {
    benefits.push({
      id: "benefit.health",
      text: "Restore business health by addressing critical signals first",
    });
  }
  for (const [index, text] of input.opportunityTexts.slice(0, 3).entries()) {
    benefits.push({
      id: `benefit.opp.${index + 1}`,
      text: text.slice(0, 120),
    });
  }
  if (benefits.length === 0) {
    benefits.push({
      id: "benefit.maintain",
      text: "Maintain current performance with light monitoring",
    });
  }

  return Object.freeze(
    benefits.slice(0, 5).map((item) => Object.freeze(item)),
  );
}
