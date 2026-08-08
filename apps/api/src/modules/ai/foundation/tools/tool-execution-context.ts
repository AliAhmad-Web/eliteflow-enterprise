/**
 * Runtime context passed into protected tool runners.
 */

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiEffectivePolicy } from "../contracts/ai-effective-policy.js";

export interface AiToolExecutionContext {
  readonly userId?: string | null;
  readonly role?: string | null;
  readonly permissions?: readonly string[];
  /** Super Admin opt-in for RESTRICTED fields in tool output. */
  readonly explicitRestrictedAccess?: boolean;
  /** Session binding for human confirmation tokens. */
  readonly sessionId?: string | null;
  /** Optional tenant / organization binding. */
  readonly tenantId?: string | null;
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
  readonly prompt?: string | null;
  readonly mode?: string | null;
}
