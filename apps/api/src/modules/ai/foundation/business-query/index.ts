/**
 * Enterprise Business Query Engine public exports.
 */

export type {
  AiBusinessQuery,
  AiBusinessQueryOutput,
  AiBusinessQueryTargetUser,
  AiBusinessQueryOrganization,
} from "./business-query.js";

export type { AiBusinessQueryIntent } from "./business-query-intent.js";
export {
  AI_BUSINESS_QUERY_INTENTS,
  isAiBusinessQueryIntent,
  formatBusinessQueryIntent,
} from "./business-query-intent.js";

export type { AiBusinessQueryEntity } from "./business-query-entity.js";
export {
  AI_BUSINESS_QUERY_ENTITIES,
  isAiBusinessQueryEntity,
  formatBusinessQueryEntity,
  moduleIdForEntity,
  moduleNameForEntity,
} from "./business-query-entity.js";

export type {
  AiBusinessQueryFilter,
  AiBusinessQueryTimeRange,
  AiBusinessQueryPriority,
  AiBusinessQueryScope,
} from "./business-query-filter.js";
export {
  AI_BUSINESS_QUERY_FILTERS,
  isAiBusinessQueryFilter,
  formatBusinessQueryFilter,
  formatBusinessQueryTimeRange,
  timeRangeFromFilters,
  priorityFromFilters,
  scopeFromFilters,
} from "./business-query-filter.js";

export {
  clampBusinessQueryConfidence,
  scoreBusinessQueryConfidence,
} from "./business-query-confidence.js";

export {
  sanitizeBusinessQueryReason,
  buildBusinessQueryReasons,
} from "./business-query-reasons.js";

export type { ParsedBusinessQuerySignals } from "./business-query-parser.js";
export { parseBusinessQuerySignals } from "./business-query-parser.js";

export type { BuildBusinessQueryInput } from "./business-query-builder.js";
export { buildBusinessQuery } from "./business-query-builder.js";

export type { ResolveBusinessQueryInput } from "./business-query-engine.js";
export {
  resolveBusinessQuery,
  businessQueryEngine,
} from "./business-query-engine.js";

export { formatBusinessQueryForRuntime } from "./business-query-runtime.js";
