/**
 * Immutable Enterprise Business Query model.
 * Structured understanding of a business request — never executes.
 */

import type { AiBusinessQueryIntent } from "./business-query-intent.js";
import type { AiBusinessQueryEntity } from "./business-query-entity.js";
import type {
  AiBusinessQueryFilter,
  AiBusinessQueryPriority,
  AiBusinessQueryScope,
  AiBusinessQueryTimeRange,
} from "./business-query-filter.js";

export type AiBusinessQueryOutput =
  | "summary"
  | "list"
  | "details"
  | "count";

export type AiBusinessQueryTargetUser = "current" | "none";

export type AiBusinessQueryOrganization = "current" | "none";

/**
 * Frozen structured business query attached to pipeline state.
 * Safe metadata only — never carries records, emails, tokens, or secrets.
 */
export interface AiBusinessQuery {
  readonly intent: AiBusinessQueryIntent;
  readonly entity: AiBusinessQueryEntity | null;
  readonly moduleId: string | null;
  readonly moduleName: string | null;
  readonly filters: readonly AiBusinessQueryFilter[];
  readonly timeRange: AiBusinessQueryTimeRange;
  readonly scope: AiBusinessQueryScope;
  readonly targetUser: AiBusinessQueryTargetUser;
  readonly organization: AiBusinessQueryOrganization;
  readonly priority: AiBusinessQueryPriority;
  readonly confidence: number;
  readonly reasoning: readonly string[];
  readonly output: AiBusinessQueryOutput;
}
