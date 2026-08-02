/**
 * Build memory relationship links from entries and similarity hits.
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import {
  freezeMemoryRelation,
  type AiMemoryRelation,
  type AiMemoryRelationKind,
} from "./memory-relations.js";
import type { SimilarityHit } from "./similarity-search.js";

function sharedTags(a: AiMemoryEntry, b: AiMemoryEntry): readonly string[] {
  const setB = new Set(b.tags.map((t) => t.toLowerCase()));
  return a.tags.filter((t) => setB.has(t.toLowerCase()));
}

function link(
  fromId: string,
  toId: string,
  kind: AiMemoryRelationKind,
  strength: number,
  label: string,
): AiMemoryRelation {
  return freezeMemoryRelation({
    fromId,
    toId,
    kind,
    strength: Math.round(Math.max(0, Math.min(1, strength)) * 1000) / 1000,
    label,
  });
}

export function buildMemoryRelations(input: {
  readonly entries: readonly AiMemoryEntry[];
  readonly similarityHits?: readonly SimilarityHit[];
  readonly moduleHint?: string | null;
}): readonly AiMemoryRelation[] {
  const relations: AiMemoryRelation[] = [];
  const entries = input.entries.slice(0, 24);

  for (let i = 0; i < entries.length; i += 1) {
    const a = entries[i];
    if (!a) continue;
    for (let j = i + 1; j < entries.length; j += 1) {
      const b = entries[j];
      if (!b) continue;

      const tags = sharedTags(a, b);
      if (tags.length > 0) {
        relations.push(
          link(
            a.id,
            b.id,
            "same-topic",
            Math.min(1, 0.4 + tags.length * 0.15),
            tags.slice(0, 2).join(", "),
          ),
        );
      }

      if (a.type === b.type && a.scope === b.scope) {
        relations.push(
          link(a.id, b.id, "related-to", 0.45, `${a.type}/${a.scope}`),
        );
      }

      if (
        a.summary.toLowerCase() === b.summary.toLowerCase() ||
        (a.summary.length > 20 &&
          b.summary.length > 20 &&
          a.summary.toLowerCase().includes(b.summary.toLowerCase().slice(0, 40)))
      ) {
        relations.push(link(a.id, b.id, "duplicate-of", 0.9, "near-duplicate"));
      }

      if (a.type === "longterm" && b.type !== "longterm") {
        relations.push(link(a.id, b.id, "parent-of", 0.55, "longterm-parent"));
        relations.push(link(b.id, a.id, "child-of", 0.55, "longterm-child"));
      }

      if (a.scope === "conversation" && b.scope === "conversation") {
        relations.push(
          link(a.id, b.id, "same-conversation", 0.5, "conversation"),
        );
      }

      if (a.scope === "user" && b.scope === "user") {
        relations.push(link(a.id, b.id, "same-user", 0.5, "user"));
      }
    }
  }

  for (const hit of input.similarityHits ?? []) {
    const peer = entries.find((e) => e.id !== hit.entry.id);
    if (!peer) continue;
    relations.push(
      link(hit.entry.id, peer.id, "related-to", hit.score, "similarity"),
    );
  }

  if (input.moduleHint) {
    for (const entry of entries) {
      if (
        entry.summary.toLowerCase().includes(input.moduleHint.toLowerCase()) ||
        entry.tags.some((t) => t.toLowerCase() === "module")
      ) {
        relations.push(
          link(entry.id, `module:${input.moduleHint}`, "same-module", 0.6, input.moduleHint),
        );
      }
    }
  }

  // Deduplicate by from|to|kind
  const seen = new Set<string>();
  const unique: AiMemoryRelation[] = [];
  for (const rel of relations) {
    const key = `${rel.fromId}|${rel.toId}|${rel.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(rel);
  }

  return Object.freeze(unique.slice(0, 80));
}

/**
 * Select related memory entries from relations + similarity.
 */
export function linkRelatedMemories(input: {
  readonly entries: readonly AiMemoryEntry[];
  readonly relations: readonly AiMemoryRelation[];
  readonly seedIds: readonly string[];
  readonly maxRelated?: number;
}): readonly AiMemoryEntry[] {
  const maxRelated = input.maxRelated ?? 6;
  const byId = new Map(input.entries.map((e) => [e.id, e]));
  const relatedIds = new Set<string>();

  for (const seed of input.seedIds) {
    for (const rel of input.relations) {
      if (rel.fromId === seed) relatedIds.add(rel.toId);
      if (rel.toId === seed) relatedIds.add(rel.fromId);
    }
  }

  for (const seed of input.seedIds) {
    relatedIds.delete(seed);
  }

  const related: AiMemoryEntry[] = [];
  for (const id of relatedIds) {
    const entry = byId.get(id);
    if (entry) related.push(entry);
    if (related.length >= maxRelated) break;
  }

  return Object.freeze(related);
}
