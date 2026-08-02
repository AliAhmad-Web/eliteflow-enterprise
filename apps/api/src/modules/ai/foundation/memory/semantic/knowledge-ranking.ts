/**
 * Rank knowledge nodes for retrieval / prompt summaries.
 */

import type { AiKnowledgeEdge } from "./knowledge-edge.js";
import type { AiKnowledgeNode } from "./knowledge-node.js";

export interface RankedKnowledgeNode {
  readonly node: AiKnowledgeNode;
  readonly score: number;
}

export function rankKnowledgeNodes(input: {
  readonly nodes: readonly AiKnowledgeNode[];
  readonly edges: readonly AiKnowledgeEdge[];
  readonly seedNodeIds?: readonly string[];
  readonly maxNodes?: number;
}): readonly RankedKnowledgeNode[] {
  const degree = new Map<string, number>();
  for (const edge of input.edges) {
    degree.set(edge.fromId, (degree.get(edge.fromId) ?? 0) + edge.weight);
    degree.set(edge.toId, (degree.get(edge.toId) ?? 0) + edge.weight);
  }

  const seeds = new Set(input.seedNodeIds ?? []);
  const ranked = input.nodes.map((node) => {
    const base = degree.get(node.id) ?? 0;
    const boost = seeds.has(node.id) ? 1 : 0;
    const kindBoost =
      node.kind === "topic" ? 0.2 : node.kind === "memory" ? 0.3 : 0.1;
    const score = Math.min(1, base / 4 + boost * 0.4 + kindBoost);
    return Object.freeze({
      node,
      score: Math.round(score * 1000) / 1000,
    });
  });

  ranked.sort((a, b) => b.score - a.score);
  return Object.freeze(ranked.slice(0, input.maxNodes ?? 12));
}
