/**
 * Action safety rules — planning constraints only.
 * Never executes.
 */

export interface AiActionSafetyRule {
  readonly id: string;
  readonly rule: string;
  readonly enforced: boolean;
}

export interface AiActionSafety {
  readonly rules: readonly AiActionSafetyRule[];
  readonly summary: string;
}

function sanitize(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildActionSafety(input: {
  readonly privacyMode: boolean;
}): AiActionSafety {
  const rules = Object.freeze([
    Object.freeze({
      id: "safety.no.execution",
      rule: sanitize("Do not execute business actions from this plan"),
      enforced: true,
    }),
    Object.freeze({
      id: "safety.no.services",
      rule: sanitize("Do not call enterprise services from planning"),
      enforced: true,
    }),
    Object.freeze({
      id: "safety.no.tools",
      rule: sanitize("Do not invoke tools from planning stage"),
      enforced: true,
    }),
    Object.freeze({
      id: "safety.safe.metadata",
      rule: sanitize("Expose SAFE planning metadata only to Prompt Engineering"),
      enforced: true,
    }),
    Object.freeze({
      id: "safety.privacy",
      rule: sanitize("Respect privacy mode — withhold detailed planning when set"),
      enforced: input.privacyMode,
    }),
  ]);

  return Object.freeze({
    rules,
    summary: sanitize(
      input.privacyMode
        ? "Safety: planning-only with privacy constraints"
        : "Safety: planning-only, no execution or service calls",
    ),
  });
}
