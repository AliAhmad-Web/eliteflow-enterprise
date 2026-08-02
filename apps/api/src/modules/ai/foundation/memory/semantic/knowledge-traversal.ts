/**
 * Knowledge graph traversal helpers.
 */

import type { AiKnowledgeEdge } from "./knowledge-edge.js";
import type { AiKnowledgeNode } from "./knowledge-node.js";

export function traverseKnowledgeNeighbors(
  nodeId: string,
  edges: readonly AiKnowledgeEdge[],
  maxDepth = 1,
): readonly string[] {
  const visited = new Set<string>([nodeId]);
  let frontier = [nodeId];

  for (let depth = 0; depth < maxDepth; depth += 1) {
    const next: string[] = [];
    for (const current of frontier) {
      for (const edge of edges) {
        if (edge.fromId === current && !visited.has(edge.toId)) {
          visited.add(edge.toId);
          next.push(edge.toId);
        }
        if (edge.toId === current && !visited.has(edge.fromId)) {
          visited.add(edge.fromId);
          next.push(edge.fromId);
        }
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }

  visited.delete(nodeId);
  return Object.freeze([...visited]);
}

export function collectNodeLabels(
  nodeIds: readonly string[],
  nodes: readonly AiKnowledgeNode[],
): readonly string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return Object.freeze(
    nodeIds
      .map((id) => byId.get(id)?.label)
      .filter((label): label is string => Boolean(label))
      .slice(0, 12),
  );
}
