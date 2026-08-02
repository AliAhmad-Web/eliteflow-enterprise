/**
 * Action dry-run summary — simulated outcomes without execution.
 */

export interface AiActionDryRun {
  readonly simulated: boolean;
  readonly wouldExecute: boolean;
  readonly blockedReasons: readonly string[];
  readonly summary: string;
}

function sanitize(value: string, max = 160): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildActionDryRun(input: {
  readonly stepCount: number;
  readonly requiresApproval: boolean;
  readonly privacyMode: boolean;
  readonly fallback: boolean;
}): AiActionDryRun {
  const blockedReasons: string[] = [
    "planning-only-mode",
    "execution-disabled",
  ];
  if (input.requiresApproval) blockedReasons.push("approval-required");
  if (input.privacyMode) blockedReasons.push("privacy-mode");
  if (input.fallback) blockedReasons.push("fallback-action");

  return Object.freeze({
    simulated: true,
    wouldExecute: false,
    blockedReasons: Object.freeze(blockedReasons),
    summary: sanitize(
      `Dry run: ${input.stepCount} steps simulated; execution blocked (${blockedReasons.length} gates)`,
    ),
  });
}
