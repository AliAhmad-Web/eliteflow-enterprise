/**
 * Human confirmation configuration (Phase 2 Step 5).
 *
 * Env:
 * - AI_CONFIRMATION_ENABLED
 * - AI_CONFIRMATION_EXPIRATION_MINUTES
 * - AI_CONFIRMATION_HIGH_RISK_ONLY
 */

function parseEnvFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return defaultValue;
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

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

/** Master switch — defaults ON so critical AI actions require approval. */
export function isAiConfirmationEnabled(): boolean {
  return parseEnvFlag(process.env.AI_CONFIRMATION_ENABLED, true);
}

export function getAiConfirmationExpirationMinutes(): number {
  return parsePositiveInt(process.env.AI_CONFIRMATION_EXPIRATION_MINUTES, 10);
}

/** When true, only HIGH/CRITICAL actions require confirmation. */
export function isAiConfirmationHighRiskOnly(): boolean {
  return parseEnvFlag(process.env.AI_CONFIRMATION_HIGH_RISK_ONLY, false);
}
