/**
 * Runtime context passed into protected tool runners.
 */

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiEffectivePolicy } from "../contracts/ai-effective-policy.js";

export interface AiToolExecutionContext {
  readonly userId?: string | null;
  readonly role?: string | null;
  readonly permissions?: readonly string[];
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
  readonly prompt?: string | null;
  readonly mode?: string | null;
}
