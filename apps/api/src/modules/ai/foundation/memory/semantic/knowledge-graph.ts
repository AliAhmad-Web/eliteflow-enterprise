/**
 * Runtime knowledge graph model and builder.
 */

import { sanitizeMemoryText, type AiMemoryEntry } from "../memory-entry.js";
import {
  freezeKnowledgeEdge,
  type AiKnowledgeEdge,
  type AiKnowledgeEdgeKind,
} from "./knowledge-edge.js";
import {
  freezeKnowledgeNode,
  type AiKnowledgeNode,
} from "./knowledge-node.js";
import type { AiMemoryRelation } from "./memory-relations.js";
import { rankKnowledgeNodes } from "./knowledge-ranking.js";
import { collectNodeLabels, traverseKnowledgeNeighbors } from "./knowledge-traversal.js";

export interface AiKnowledgeGraph {
  readonly nodes: readonly AiKnowledgeNode[];
  readonly edges: readonly AiKnowledgeEdge[];
  readonly topics: readonly string[];
  readonly confidence: number;
}

export interface AiKnowledgeGraphSummary {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly topics: readonly string[];
  readonly relatedTopics: readonly string[];
  readonly retrievedContext: readonly string[];
  readonly confidence: number;
  readonly summary: string;
}

export interface AiKnowledgeMemory {
  readonly graph: AiKnowledgeGraph;
  readonly summary: AiKnowledgeGraphSummary;
  readonly relatedMemoryIds: readonly string[];
  readonly notes: readonly string[];
}

function relationToEdgeKind(
  kind: AiMemoryRelation["kind"],
): AiKnowledgeEdgeKind {
  switch (kind) {
    case "parent-of":
    case "child-of":
      return "parent-child";
    case "same-topic":
      return "topic";
    case "same-conversation":
      return "conversation";
    case "same-user":
      return "user";
    case "same-module":
      return "module";
    case "related-to":
    case "duplicate-of":
      return "relates";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function buildKnowledgeGraph(input: {
  readonly entries: readonly AiMemoryEntry[];
  readonly relations: readonly AiMemoryRelation[];
  readonly moduleHint?: string | null;
  readonly conversationId?: string | null;
  readonly userId?: string | null;
}): AiKnowledgeGraph {
  const nodes: AiKnowledgeNode[] = [];
  const edges: AiKnowledgeEdge[] = [];
  const topics = new Set<string>();

  for (const entry of input.entries.slice(0, 24)) {
    nodes.push(
      freezeKnowledgeNode({
        id: `memory:${entry.id}`,
        kind: "memory",
        label: sanitizeMemoryText(entry.summary, 60),
        memoryId: entry.id,
      }),
    );
    for (const tag of entry.tags.slice(0, 4)) {
      const topicId = `topic:${tag.toLowerCase()}`;
      topics.add(tag);
      if (!nodes.some((n) => n.id === topicId)) {
        nodes.push(
          freezeKnowledgeNode({
            id: topicId,
            kind: "topic",
            label: sanitizeMemoryText(tag, 40),
          }),
        );
      }
      edges.push(
        freezeKnowledgeEdge({
          id: `edge:${entry.id}:${topicId}`,
          fromId: `memory:${entry.id}`,
          toId: topicId,
          kind: "topic",
          weight: 0.6,
          label: tag,
        }),
      );
    }
  }

  if (input.moduleHint) {
    const moduleId = `module:${input.moduleHint}`;
    nodes.push(
      freezeKnowledgeNode({
        id: moduleId,
        kind: "module",
        label: sanitizeMemoryText(input.moduleHint, 40),
      }),
    );
    for (const entry of input.entries.slice(0, 8)) {
      edges.push(
        freezeKnowledgeEdge({
          id: `edge:${entry.id}:${moduleId}`,
          fromId: `memory:${entry.id}`,
          toId: moduleId,
          kind: "module",
          weight: 0.5,
          label: "module",
        }),
      );
    }
  }

  if (input.conversationId) {
    const conversationNode = `conversation:active`;
    nodes.push(
      freezeKnowledgeNode({
        id: conversationNode,
        kind: "conversation",
        label: "Active Conversation",
      }),
    );
  }

  if (input.userId) {
    nodes.push(
      freezeKnowledgeNode({
        id: "user:active",
        kind: "user",
        label: "Active User",
      }),
    );
  }

  for (const rel of input.relations.slice(0, 60)) {
    const fromId = rel.fromId.startsWith("module:")
      ? rel.fromId
      : `memory:${rel.fromId}`;
    const toId = rel.toId.startsWith("module:")
      ? rel.toId
      : `memory:${rel.toId}`;
    edges.push(
      freezeKnowledgeEdge({
        id: `rel:${rel.fromId}:${rel.toId}:${rel.kind}`,
        fromId,
        toId,
        kind: relationToEdgeKind(rel.kind),
        weight: rel.strength,
        label: rel.label,
      }),
    );
  }

  const uniqueNodes = Object.freeze(
    [...new Map(nodes.map((n) => [n.id, n])).values()],
  );
  const uniqueEdges = Object.freeze(
    [...new Map(edges.map((e) => [e.id, e])).values()].slice(0, 120),
  );

  const ranked = rankKnowledgeNodes({
    nodes: uniqueNodes,
    edges: uniqueEdges,
    maxNodes: 8,
  });
  const confidence =
    ranked.length === 0
      ? 0
      : Math.round(
          (ranked.reduce((s, r) => s + r.score, 0) / ranked.length) * 1000,
        ) / 1000;

  return Object.freeze({
    nodes: uniqueNodes,
    edges: uniqueEdges,
    topics: Object.freeze([...topics].slice(0, 12)),
    confidence,
  });
}

export function summarizeKnowledgeGraph(
  graph: AiKnowledgeGraph,
  seedMemoryIds: readonly string[] = [],
): AiKnowledgeGraphSummary {
  const seedNodeIds = seedMemoryIds.map((id) => `memory:${id}`);
  const neighborIds =
    seedNodeIds.length > 0
      ? traverseKnowledgeNeighbors(seedNodeIds[0]!, graph.edges, 1)
      : [];
  const relatedTopics = collectNodeLabels(
    neighborIds.filter((id) => id.startsWith("topic:")),
    graph.nodes,
  );
  const retrievedContext = graph.nodes
    .filter((n) => n.kind === "memory")
    .slice(0, 4)
    .map((n) => n.label);

  const summary = sanitizeMemoryText(
    `${graph.nodes.length} knowledge nodes; ${graph.edges.length} links; topics=${graph.topics.slice(0, 4).join(",") || "none"}`,
    200,
  );

  return Object.freeze({
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    topics: graph.topics,
    relatedTopics,
    retrievedContext: Object.freeze(retrievedContext),
    confidence: graph.confidence,
    summary,
  });
}

export function buildKnowledgeMemory(input: {
  readonly entries: readonly AiMemoryEntry[];
  readonly relations: readonly AiMemoryRelation[];
  readonly moduleHint?: string | null;
  readonly conversationId?: string | null;
  readonly userId?: string | null;
}): AiKnowledgeMemory {
  const graph = buildKnowledgeGraph(input);
  const relatedMemoryIds = Object.freeze(
    graph.nodes
      .filter((n) => n.kind === "memory" && n.memoryId)
      .map((n) => n.memoryId!)
      .slice(0, 12),
  );
  const summary = summarizeKnowledgeGraph(graph, relatedMemoryIds);

  return Object.freeze({
    graph,
    summary,
    relatedMemoryIds,
    notes: Object.freeze([
      `nodes:${graph.nodes.length}`,
      `edges:${graph.edges.length}`,
      `topics:${graph.topics.length}`,
    ]),
  });
}
