/**
 * Automation provider context — SAFE runtime signals for providers.
 * Never includes secrets or raw records.
 */

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiEffectivePolicy } from "../contracts/ai-effective-policy.js";
import type { AiAutomationValidatedContext } from "./automation-request.js";
import type { AiAutomationExecutionMode } from "./automation-request.js";

export interface AiAutomationProviderContext {
  readonly userId: string | null;
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
  readonly privacyMode: boolean;
  readonly validated: AiAutomationValidatedContext;
  readonly mode: AiAutomationExecutionMode;
  readonly timeoutMs: number;
  readonly enableExternalWorkflows: boolean;
  readonly enableN8n: boolean;
}

export function buildAutomationProviderContext(input: {
  readonly userId?: string | null;
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
  readonly validated: AiAutomationValidatedContext;
  readonly mode: AiAutomationExecutionMode;
  readonly timeoutMs?: number;
  readonly enableExternalWorkflows?: boolean;
  readonly enableN8n?: boolean;
}): AiAutomationProviderContext {
  return Object.freeze({
    userId: input.userId?.trim() || null,
    activeContext: input.activeContext,
    policy: input.policy,
    privacyMode: input.policy.privacyMode === true,
    validated: input.validated,
    mode: input.mode,
    timeoutMs:
      typeof input.timeoutMs === "number" && input.timeoutMs > 0
        ? Math.min(Math.floor(input.timeoutMs), 60_000)
        : 5_000,
    enableExternalWorkflows: input.enableExternalWorkflows === true,
    enableN8n: input.enableN8n === true,
  });
}
