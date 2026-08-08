/**
 * Prompt security configuration (Phase 2 Step 4).
 *
 * Env:
 * - PROMPT_SECURITY_ENABLED
 * - PROMPT_INJECTION_THRESHOLD (0–100)
 * - PROMPT_OUTPUT_VALIDATION
 * - PROMPT_DOCUMENT_SCAN
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

function parseThreshold(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.floor(n)));
}

/** Master switch — defaults ON. */
export function isPromptSecurityEnabled(): boolean {
  return parseEnvFlag(process.env.PROMPT_SECURITY_ENABLED, true);
}

/** Score at/above which input is blocked (default 60). */
export function getPromptInjectionThreshold(): number {
  return parseThreshold(process.env.PROMPT_INJECTION_THRESHOLD, 60);
}

export function isPromptOutputValidationEnabled(): boolean {
  return parseEnvFlag(process.env.PROMPT_OUTPUT_VALIDATION, true);
}

export function isPromptDocumentScanEnabled(): boolean {
  return parseEnvFlag(process.env.PROMPT_DOCUMENT_SCAN, true);
}
