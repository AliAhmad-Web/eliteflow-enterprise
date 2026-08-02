/**
 * Format semantic / knowledge memory as SAFE Runtime Instructions metadata.
 * Never exposes embeddings, internal IDs, private memory, or raw scores.
 */

import type { AiKnowledgeMemory } from "./knowledge-graph.js";
import type { AiSemanticMemory } from "./semantic-memory.js";
import type { AiMemoryEntry } from "../memory-entry.js";
import { sanitizeMemoryText } from "../memory-entry.js";

function sanitizeLine(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only semantic + knowledge metadata for Prompt Engineering.
 */
export function formatSemanticKnowledgeForRuntime(input: {
  readonly semanticMemory?: AiSemanticMemory | null;
  readonly knowledgeMemory?: AiKnowledgeMemory | null;
  readonly relatedMemories?: readonly AiMemoryEntry[] | null;
  readonly knowledgeGraphSummary?: AiKnowledgeMemory["summary"] | null;
}): string {
  const lines: string[] = [];

  const semantic = input.semanticMemory;
  const knowledge = input.knowledgeMemory;
  const summary = input.knowledgeGraphSummary ?? knowledge?.summary;
  const related = input.relatedMemories ?? [];

  if (!semantic && !knowledge && related.length === 0) {
    return "";
  }

  if (semantic && semantic.result.items.length > 0) {
    lines.push("Relevant Knowledge:");
    for (const item of semantic.result.items.slice(0, 4)) {
      lines.push(`- ${sanitizeLine(item.entry.summary, 100)}`);
    }
  } else if (summary && summary.retrievedContext.length > 0) {
    lines.push("Relevant Knowledge:");
    for (const ctx of summary.retrievedContext.slice(0, 4)) {
      lines.push(`- ${sanitizeLine(ctx, 100)}`);
    }
  }

  const topics = [
    ...(summary?.relatedTopics ?? []),
    ...(summary?.topics ?? []),
    ...((semantic?.result.items ?? []).flatMap((i) => i.topics)),
  ]
    .map((t) => sanitizeMemoryText(t, 40))
    .filter(Boolean);
  const uniqueTopics = [...new Set(topics)].slice(0, 6);
  if (uniqueTopics.length > 0) {
    lines.push("Related Topics:");
    for (const topic of uniqueTopics) {
      lines.push(`- ${topic}`);
    }
  }

  if (related.length > 0 || (semantic?.result.related.length ?? 0) > 0) {
    lines.push("Retrieved Context:");
    const contexts =
      related.length > 0
        ? related
        : (semantic?.result.related.map((r) => r.entry) ?? []);
    for (const entry of contexts.slice(0, 4)) {
      lines.push(`- ${sanitizeLine(entry.summary, 100)}`);
    }
  }

  const confidence =
    summary?.confidence ?? semantic?.result.confidence ?? 0;
  lines.push(`Knowledge Confidence: ${confidence.toFixed(2)}`);

  return lines.join("\n").trim();
}
