/**
 * Module Data Access — runtime context.
 * Carries auth/isolation signals only — never business payloads.
 */

import type { AiActiveContext } from "../../contracts/ai-active-context.js";
import type { AiEffectivePolicy } from "../../contracts/ai-effective-policy.js";

export interface AiModuleDataContext {
  readonly userId?: string | null;
  readonly role?: string | null;
  readonly email?: string | null;
  readonly permissions?: readonly string[];
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
}
