/**
 * AI budget environment configuration.
 * AI_BUDGET_ENABLED | AI_MONTHLY_DEFAULT_BUDGET | AI_DAILY_DEFAULT_BUDGET |
 * AI_SOFT_LIMIT_PERCENT | AI_HARD_LIMIT_PERCENT | AI_GRACE_MODE
 */

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim().length === 0) return defaultValue;
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      return defaultValue;
  }
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined || value.trim().length === 0) return defaultValue;
  const n = Number.parseFloat(value.trim());
  return Number.isFinite(n) && n >= 0 ? n : defaultValue;
}

export type AiBudgetConfig = {
  enabled: boolean;
  monthlyDefaultBudgetUsd: number;
  dailyDefaultBudgetUsd: number;
  softLimitPercent: number;
  hardLimitPercent: number;
  graceMode: boolean;
  /** Default monthly token budget (0 = unlimited). */
  monthlyTokenBudget: number;
  /** Default daily request budget (0 = unlimited). */
  dailyRequestBudget: number;
  /** Expected completion tokens for pre-flight estimates. */
  defaultCompletionEstimate: number;
};

export function getAiBudgetConfig(): AiBudgetConfig {
  const soft = parseNumber(process.env.AI_SOFT_LIMIT_PERCENT, 80);
  const hard = parseNumber(process.env.AI_HARD_LIMIT_PERCENT, 100);
  return {
    enabled: parseBool(process.env.AI_BUDGET_ENABLED, true),
    monthlyDefaultBudgetUsd: parseNumber(
      process.env.AI_MONTHLY_DEFAULT_BUDGET,
      100,
    ),
    dailyDefaultBudgetUsd: parseNumber(
      process.env.AI_DAILY_DEFAULT_BUDGET,
      20,
    ),
    softLimitPercent: Math.min(100, Math.max(1, soft)),
    hardLimitPercent: Math.min(200, Math.max(soft, hard)),
    graceMode: parseBool(process.env.AI_GRACE_MODE, true),
    monthlyTokenBudget: parseNumber(process.env.AI_MONTHLY_TOKEN_BUDGET, 0),
    dailyRequestBudget: parseNumber(process.env.AI_DAILY_REQUEST_BUDGET, 0),
    defaultCompletionEstimate: parseNumber(
      process.env.AI_BUDGET_COMPLETION_ESTIMATE,
      800,
    ),
  };
}

export function isAiBudgetEnabled(): boolean {
  return getAiBudgetConfig().enabled;
}
