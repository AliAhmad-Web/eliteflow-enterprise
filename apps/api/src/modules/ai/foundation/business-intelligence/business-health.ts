/**
 * Business Intelligence health — overall operational health.
 */

export type AiBiHealthLevel = "healthy" | "fair" | "at-risk" | "critical";

export interface AiBiHealth {
  readonly level: AiBiHealthLevel;
  readonly score: number;
  readonly summary: string;
}

export function formatBiHealthLevel(level: AiBiHealthLevel): string {
  switch (level) {
    case "healthy":
      return "Healthy";
    case "fair":
      return "Fair";
    case "at-risk":
      return "At Risk";
    case "critical":
      return "Critical";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export function buildBusinessHealth(input: {
  readonly overallKpiScore: number;
  readonly riskHighCount: number;
  readonly criticalAlertCount: number;
}): AiBiHealth {
  let level: AiBiHealthLevel;
  if (input.criticalAlertCount > 0 || input.riskHighCount >= 2) {
    level = "critical";
  } else if (input.overallKpiScore >= 70 && input.riskHighCount === 0) {
    level = "healthy";
  } else if (input.overallKpiScore >= 50) {
    level = "fair";
  } else {
    level = "at-risk";
  }

  return Object.freeze({
    level,
    score: input.overallKpiScore,
    summary: `${formatBiHealthLevel(level)} business health (score ${input.overallKpiScore})`,
  });
}
