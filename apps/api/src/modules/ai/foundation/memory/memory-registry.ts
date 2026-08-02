/**
 * Enterprise AI Memory Registry.
 * Registers memory source definitions. No remote/plugin loading. No persistence.
 */

import type { AiMemoryScope } from "./memory-scope.js";
import type { AiMemoryType } from "./memory-types.js";

export interface AiMemorySourceDefinition {
  readonly id: string;
  readonly name: string;
  readonly type: AiMemoryType;
  readonly defaultScope: AiMemoryScope;
  readonly enabled: boolean;
  readonly description: string;
}

function freezeSource(
  source: AiMemorySourceDefinition,
): AiMemorySourceDefinition {
  return Object.freeze({
    ...source,
    enabled: source.enabled !== false,
  });
}

export const BUILTIN_MEMORY_SOURCES: readonly AiMemorySourceDefinition[] =
  Object.freeze([
    freezeSource({
      id: "conversation-history",
      name: "Conversation History",
      type: "conversation",
      defaultScope: "conversation",
      enabled: true,
      description: "Runtime conversation turns available in the request.",
    }),
    freezeSource({
      id: "user-identity",
      name: "User Identity",
      type: "user",
      defaultScope: "user",
      enabled: true,
      description: "Safe user role/identity metadata from active context.",
    }),
    freezeSource({
      id: "business-signals",
      name: "Business Signals",
      type: "business",
      defaultScope: "request",
      enabled: true,
      description: "Safe business query/decision/execution summaries.",
    }),
    freezeSource({
      id: "session-context",
      name: "Session Context",
      type: "session",
      defaultScope: "session",
      enabled: true,
      description: "Conversation/session identifiers as metadata only.",
    }),
    freezeSource({
      id: "active-context",
      name: "Active Context",
      type: "context",
      defaultScope: "request",
      enabled: true,
      description: "Module, surface, and mode from active context.",
    }),
    freezeSource({
      id: "preference-signals",
      name: "Preference Signals",
      type: "preference",
      defaultScope: "user",
      enabled: true,
      description: "Agent memory strategy and preference metadata.",
    }),
    freezeSource({
      id: "working-prompt",
      name: "Working Prompt",
      type: "working",
      defaultScope: "request",
      enabled: true,
      description: "Current request working memory from the user prompt.",
    }),
    freezeSource({
      id: "persistent-longterm",
      name: "Long-term Memory",
      type: "longterm",
      defaultScope: "user",
      enabled: true,
      description: "Persisted long-term memory summaries for the user.",
    }),
  ]);

/**
 * In-memory Enterprise Memory Source Registry.
 */
export class AiMemoryRegistry {
  private readonly byId = new Map<string, AiMemorySourceDefinition>();

  constructor(
    seed: readonly AiMemorySourceDefinition[] = BUILTIN_MEMORY_SOURCES,
  ) {
    for (const source of seed) {
      this.byId.set(source.id, freezeSource(source));
    }
  }

  /** Controlled upsert for tests — not a plugin loader. */
  register(source: AiMemorySourceDefinition): void {
    this.byId.set(source.id, freezeSource(source));
  }

  get(sourceId: string): AiMemorySourceDefinition | undefined {
    return this.byId.get(sourceId);
  }

  list(): readonly AiMemorySourceDefinition[] {
    return Object.freeze([...this.byId.values()]);
  }

  listEnabled(): readonly AiMemorySourceDefinition[] {
    return Object.freeze(
      [...this.byId.values()].filter((source) => source.enabled !== false),
    );
  }

  listByType(type: AiMemoryType): readonly AiMemorySourceDefinition[] {
    return Object.freeze(
      [...this.byId.values()].filter((source) => source.type === type),
    );
  }
}

/** Process-wide Enterprise Memory Registry (seeded with built-in sources). */
export const enterpriseMemoryRegistry = new AiMemoryRegistry();
