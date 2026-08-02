/**
 * Business Intelligence forecast — near-term outlook from runtime signals.
 */

export type AiBiForecastOutlook =
  | "positive"
  | "neutral"
  | "cautious"
  | "negative";

export interface AiBiForecast {
  readonly outlook: AiBiForecastOutlook;
  readonly horizon: "near-term";
  readonly summary: string;
}

export function formatBiForecastOutlook(
  outlook: AiBiForecastOutlook,
): string {
  switch (outlook) {
    case "positive":
      return "Positive";
    case "neutral":
      return "Neutral";
    case "cautious":
      return "Cautious";
    case "negative":
      return "Negative";
    default: {
      const _exhaustive: never = outlook;
      return _exhaustive;
    }
  }
}

export function buildBusinessForecast(input: {
  readonly overallTrend: "improving" | "stable" | "declining" | "unknown";
  readonly riskHighCount: number;
  readonly executableWorkflow: boolean;
}): AiBiForecast {
  let outlook: AiBiForecastOutlook;
  switch (input.overallTrend) {
    case "improving":
      outlook = input.riskHighCount > 0 ? "cautious" : "positive";
      break;
    case "stable":
      outlook = input.riskHighCount > 0 ? "cautious" : "neutral";
      break;
    case "declining":
      outlook = "negative";
      break;
    case "unknown":
      outlook = "neutral";
      break;
    default: {
      const _exhaustive: never = input.overallTrend;
      return _exhaustive;
    }
  }

  const summary = (() => {
    switch (outlook) {
      case "positive":
        return input.executableWorkflow
          ? "Near-term outlook positive with executable follow-up available"
          : "Near-term outlook positive";
      case "neutral":
        return "Near-term outlook stable with limited directional pressure";
      case "cautious":
        return "Near-term outlook cautious — monitor elevated signals";
      case "negative":
        return "Near-term outlook negative — prioritization recommended";
      default: {
        const _exhaustive: never = outlook;
        return _exhaustive;
      }
    }
  })();

  return Object.freeze({
    outlook,
    horizon: "near-term" as const,
    summary,
  });
}
