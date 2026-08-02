/**
 * Aggregate semantic memory snapshot for pipeline state.
 */

import type { AiSemanticMemoryQuery } from "./semantic-memory-query.js";
import type { AiSemanticMemoryResult } from "./semantic-memory-result.js";

export interface AiSemanticMemory {
  readonly query: AiSemanticMemoryQuery;
  readonly result: AiSemanticMemoryResult;
  readonly embeddingsBuilt: boolean;
  readonly similarityEnabled: boolean;
  readonly relationshipsEnabled: boolean;
  readonly notes: readonly string[];
}
