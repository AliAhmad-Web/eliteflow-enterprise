/**
 * Business analysis item — structured observation from module summaries.
 */

export type AiBusinessAnalysisSeverity = "info" | "watch" | "attention";

export interface AiBusinessAnalysisItem {
  readonly moduleName: string;
  readonly observation: string;
  readonly severity: AiBusinessAnalysisSeverity;
}

export function sanitizeAnalysisText(value: string, max = 160): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}
