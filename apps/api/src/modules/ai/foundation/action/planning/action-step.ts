/**
 * Action step metadata for planning.
 * Never executes.
 */

export type AiActionStepStatus = "planned" | "blocked" | "optional";

export interface AiActionStep {
  readonly id: string;
  readonly order: number;
  readonly name: string;
  readonly description: string;
  readonly capability: string | null;
  readonly status: AiActionStepStatus;
  readonly optional: boolean;
}

export function formatActionStepStatus(status: AiActionStepStatus): string {
  switch (status) {
    case "planned":
      return "Planned";
    case "blocked":
      return "Blocked";
    case "optional":
      return "Optional";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function sanitize(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildActionSteps(input: {
  readonly actionName: string;
  readonly capabilities: readonly string[];
  readonly fallback: boolean;
  readonly requiresApproval: boolean;
}): readonly AiActionStep[] {
  if (input.fallback || input.capabilities.length === 0) {
    return Object.freeze([
      Object.freeze({
        id: "step.clarify",
        order: 1,
        name: "Clarify Intent",
        description: sanitize(
          `Clarify goals for ${input.actionName} before any execution`,
        ),
        capability: "clarify",
        status: "planned" as const,
        optional: false,
      }),
      Object.freeze({
        id: "step.summarize",
        order: 2,
        name: "Summarize Options",
        description: "Produce a safe planning summary for the user",
        capability: "assist",
        status: "planned" as const,
        optional: false,
      }),
    ]);
  }

  const steps: AiActionStep[] = [
    Object.freeze({
      id: "step.prepare",
      order: 1,
      name: "Prepare Context",
      description: sanitize(`Gather safe context for ${input.actionName}`),
      capability: null,
      status: "planned",
      optional: false,
    }),
  ];

  let order = 2;
  for (const capability of input.capabilities.slice(0, 4)) {
    steps.push(
      Object.freeze({
        id: `step.${capability}`,
        order,
        name: sanitize(
          `${capability.charAt(0).toUpperCase()}${capability.slice(1)} Step`,
          40,
        ),
        description: sanitize(
          `Plan ${capability} for ${input.actionName} (metadata only)`,
        ),
        capability,
        status: "planned",
        optional: false,
      }),
    );
    order += 1;
  }

  if (input.requiresApproval) {
    steps.push(
      Object.freeze({
        id: "step.approve",
        order,
        name: "Await Approval",
        description: "Human approval required before any execution",
        capability: null,
        status: "blocked" as const,
        optional: false,
      }),
    );
  }

  steps.push(
    Object.freeze({
      id: "step.verify",
      order: order + (input.requiresApproval ? 1 : 0),
      name: "Verify Outcomes",
      description: "Validate planned postconditions (no execution)",
      capability: null,
      status: "optional" as const,
      optional: true,
    }),
  );

  return Object.freeze(steps);
}
