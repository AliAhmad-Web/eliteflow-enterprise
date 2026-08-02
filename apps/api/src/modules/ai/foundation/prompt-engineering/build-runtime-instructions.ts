import type {
  AiActiveContext,
  AiContextSnippet,
} from "../contracts/ai-active-context.js";
import type { AiEffectivePolicy } from "../contracts/ai-effective-policy.js";
import type { AiToolExecution } from "../contracts/ai-tool-execution.js";

export interface BuildRuntimeInstructionsInput {
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
  readonly eligibleTools: readonly AiToolExecution[];
  readonly streaming?: boolean;
  readonly mode?: string | null;
  /** Permission-approved lightweight business summaries (optional). */
  readonly businessSnippets?: readonly AiContextSnippet[];
  /**
   * Structured tool-result runtime metadata from Tool Result Injection (optional).
   * Empty / omitted when AI_TOOL_RESULT_INJECTION is disabled.
   */
  readonly toolResultRuntime?: string;
}

function sanitizeToken(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, 120);
}

/**
 * Build Runtime Instructions from safe metadata + optional business summaries.
 * Never includes raw database records or unauthorized payloads.
 */
export function buildRuntimeInstructions(
  input: BuildRuntimeInstructionsInput,
): string {
  if (input.policy.privacyMode) {
    return [
      "Runtime metadata (privacy mode):",
      "- privacyMode: enabled",
      "- Detailed routing metadata withheld.",
    ].join("\n");
  }

  const { activeContext, businessSnippets = [], toolResultRuntime } = input;
  const lines: string[] = ["Runtime metadata (safe):"];

  lines.push(
    `- module: ${sanitizeToken(activeContext.module ?? "unknown")}`,
  );
  lines.push(`- surface: ${sanitizeToken(activeContext.surface)}`);

  if (input.mode?.trim()) {
    lines.push(`- assistMode: ${sanitizeToken(input.mode)}`);
  }

  const role = activeContext.user?.role?.trim();
  lines.push(`- userRole: ${role ? sanitizeToken(role) : "unknown"}`);

  lines.push(
    `- organizationPresent: ${
      activeContext.organization?.organizationId ? "yes" : "no"
    }`,
  );

  const conversationId = activeContext.conversationId?.trim();
  lines.push(
    `- conversationId: ${
      conversationId ? sanitizeToken(conversationId) : "none"
    }`,
  );

  lines.push(`- streaming: ${input.streaming ? "yes" : "no"}`);

  const toolNames = input.eligibleTools
    .filter((tool) => {
      switch (tool.status) {
        case "eligible":
        case "succeeded":
        case "failed":
        case "running":
        case "pending_confirmation":
          return true;
        case "skipped":
          return false;
        default: {
          const _exhaustive: never = tool.status;
          void _exhaustive;
          return false;
        }
      }
    })
    .map((tool) => sanitizeToken(tool.toolId))
    .filter(Boolean);

  lines.push(
    `- eligibleTools: ${
      toolNames.length > 0 ? toolNames.join(", ") : "none"
    }`,
  );

  lines.push(
    "- Note: No CRM, project, task, finance, or document payloads are included.",
  );

  if (businessSnippets.length > 0) {
    lines.push("");
    lines.push("Business context (permission-approved summaries):");
    for (const snippet of businessSnippets) {
      lines.push(`- [${snippet.type}] ${snippet.text}`);
    }
  }

  const toolBlock = toolResultRuntime?.trim();
  if (toolBlock) {
    lines.push("");
    lines.push(toolBlock);
  }

  return lines.join("\n");
}
