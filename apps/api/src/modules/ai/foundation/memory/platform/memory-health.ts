/**
 * Memory health scoring.
 */

export interface AiMemoryHealth {
  readonly score: number;
  readonly level: "healthy" | "fair" | "degraded" | "critical";
  readonly factors: readonly string[];
  readonly summary: string;
}

export function scoreMemoryHealth(input: {
  readonly entryCount: number;
  readonly integrityValid: boolean;
  readonly duplicateCount: number;
  readonly staleCount: number;
  readonly subsystemEnabledCount: number;
  readonly subsystemTotal: number;
}): AiMemoryHealth {
  let score = 0.5;
  const factors: string[] = [];

  if (input.integrityValid) {
    score += 0.2;
    factors.push("integrity-ok");
  } else {
    score -= 0.15;
    factors.push("integrity-issues");
  }

  if (input.entryCount > 0 && input.entryCount <= 24) {
    score += 0.15;
    factors.push("volume-balanced");
  } else if (input.entryCount > 24) {
    score -= 0.05;
    factors.push("volume-high");
  } else {
    factors.push("volume-empty");
  }

  score -= Math.min(0.2, input.duplicateCount * 0.03);
  score -= Math.min(0.15, input.staleCount * 0.02);

  const coverage =
    input.subsystemTotal > 0
      ? input.subsystemEnabledCount / input.subsystemTotal
      : 0;
  score += coverage * 0.2;
  factors.push(`coverage:${Math.round(coverage * 100)}%`);

  score = Math.max(0, Math.min(1, Math.round(score * 1000) / 1000));

  const level =
    score >= 0.8
      ? "healthy"
      : score >= 0.6
        ? "fair"
        : score >= 0.35
          ? "degraded"
          : "critical";

  return Object.freeze({
    score,
    level,
    factors: Object.freeze(factors.slice(0, 8)),
    summary: `Memory health ${level} (${score.toFixed(2)})`,
  });
}
