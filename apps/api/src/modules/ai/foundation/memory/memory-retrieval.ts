/**
 * Enterprise AI Memory Retrieval — gather runtime-only memory sources.
 * Never accesses database, Prisma, repositories, or services.
 * Never executes tools.
 */

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiEffectivePolicy } from "../contracts/ai-effective-policy.js";
import type { AiMemoryMessage } from "../contracts/ai-memory-message.js";
import type { AiAgentMemoryStrategy } from "../agents/ai-agent-memory-strategy.js";
import type { AiBusinessQuery } from "../business-query/business-query.js";
import type { AiBusinessDecision } from "../business-decision/business-decision.js";
import type { AiBusinessExecution } from "../business-execution/business-execution.js";
import {
  freezeMemoryEntry,
  sanitizeMemoryText,
  type AiMemoryEntry,
} from "./memory-entry.js";
import { resolveMemoryPriority } from "./memory-priority.js";
import type { AiMemoryScope } from "./memory-scope.js";
import type { AiMemoryType } from "./memory-types.js";
import {
  enterpriseMemoryRegistry,
  type AiMemoryRegistry,
} from "./memory-registry.js";

export interface RetrieveMemoryInput {
  readonly conversationHistory?: readonly AiMemoryMessage[];
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
  readonly userPrompt?: string | null;
  readonly mode?: string | null;
  readonly agentMemoryStrategy?: AiAgentMemoryStrategy | null;
  readonly businessQuery?: AiBusinessQuery | null;
  readonly businessDecision?: AiBusinessDecision | null;
  readonly businessExecution?: AiBusinessExecution | null;
  readonly registry?: AiMemoryRegistry;
}

function makeId(source: string, suffix: string): string {
  return `mem.${source}.${suffix}`;
}

function buildEntry(input: {
  readonly id: string;
  readonly type: AiMemoryType;
  readonly scope: AiMemoryScope;
  readonly summary: string;
  readonly source: string;
  readonly tags?: readonly string[];
  readonly permissionKeys?: readonly string[];
  readonly recency: number;
  readonly businessSignal?: boolean;
  readonly recencyBoost?: boolean;
}): AiMemoryEntry {
  return freezeMemoryEntry({
    id: input.id,
    type: input.type,
    scope: input.scope,
    priority: resolveMemoryPriority({
      type: input.type,
      businessSignal: input.businessSignal,
      recencyBoost: input.recencyBoost,
    }),
    summary: sanitizeMemoryText(input.summary, 160),
    source: input.source,
    permissionKeys: Object.freeze([...(input.permissionKeys ?? [])]),
    tags: Object.freeze([...(input.tags ?? [])]),
    recency: Math.min(1, Math.max(0, input.recency)),
    createdAt: new Date().toISOString(),
  });
}

function retrieveConversation(
  history: readonly AiMemoryMessage[],
  enabled: boolean,
): AiMemoryEntry[] {
  if (!enabled || history.length === 0) return [];

  const recent = history.slice(-4);
  return recent.map((msg, index) => {
    const role =
      msg.role === "ASSISTANT"
        ? "assistant"
        : msg.role === "SYSTEM"
          ? "system"
          : "user";
    const preview = sanitizeMemoryText(msg.content, 80);
    return buildEntry({
      id: makeId("conversation", String(index)),
      type: "conversation",
      scope: "conversation",
      summary: `Prior ${role} turn: ${preview}`,
      source: "conversation-history",
      tags: ["conversation", role],
      permissionKeys: ["ai:use"],
      recency: (index + 1) / recent.length,
      recencyBoost: index === recent.length - 1,
    });
  });
}

function retrieveUser(context: AiActiveContext, enabled: boolean): AiMemoryEntry[] {
  if (!enabled || !context.user) return [];
  const role = context.user.role?.trim();
  if (!role) {
    return [
      buildEntry({
        id: makeId("user", "identity"),
        type: "user",
        scope: "user",
        summary: "Authenticated user context is available.",
        source: "user-identity",
        tags: ["user"],
        permissionKeys: ["ai:use"],
        recency: 0.5,
      }),
    ];
  }
  return [
    buildEntry({
      id: makeId("user", "role"),
      type: "user",
      scope: "user",
      summary: `User role: ${sanitizeMemoryText(role, 40)}`,
      source: "user-identity",
      tags: ["user", "role"],
      permissionKeys: ["ai:use"],
      recency: 0.55,
    }),
  ];
}

function retrieveSession(
  context: AiActiveContext,
  enabled: boolean,
): AiMemoryEntry[] {
  if (!enabled) return [];
  const entries: AiMemoryEntry[] = [];
  if (context.conversationId) {
    entries.push(
      buildEntry({
        id: makeId("session", "conversation"),
        type: "session",
        scope: "session",
        summary: "Active conversation session is bound to this request.",
        source: "session-context",
        tags: ["session", "conversation"],
        permissionKeys: [],
        recency: 0.6,
      }),
    );
  }
  if (context.organization?.organizationKey || context.organization?.organizationId) {
    entries.push(
      buildEntry({
        id: makeId("session", "organization"),
        type: "session",
        scope: "organization",
        summary: "Organization scope is present for this request.",
        source: "session-context",
        tags: ["session", "organization"],
        permissionKeys: [],
        recency: 0.4,
      }),
    );
  }
  return entries;
}

function retrieveContext(
  context: AiActiveContext,
  mode: string | null | undefined,
  enabled: boolean,
): AiMemoryEntry[] {
  if (!enabled) return [];
  const entries: AiMemoryEntry[] = [];
  if (context.module) {
    entries.push(
      buildEntry({
        id: makeId("context", "module"),
        type: "context",
        scope: "request",
        summary: `Active module: ${sanitizeMemoryText(context.module, 40)}`,
        source: "active-context",
        tags: ["context", "module"],
        permissionKeys: [],
        recency: 0.7,
      }),
    );
  }
  if (context.surface) {
    entries.push(
      buildEntry({
        id: makeId("context", "surface"),
        type: "context",
        scope: "request",
        summary: `Surface: ${sanitizeMemoryText(String(context.surface), 40)}`,
        source: "active-context",
        tags: ["context", "surface"],
        permissionKeys: [],
        recency: 0.65,
      }),
    );
  }
  const effectiveMode = mode ?? context.mode;
  if (effectiveMode) {
    entries.push(
      buildEntry({
        id: makeId("context", "mode"),
        type: "context",
        scope: "request",
        summary: `Assist mode: ${sanitizeMemoryText(effectiveMode, 40)}`,
        source: "active-context",
        tags: ["context", "mode"],
        permissionKeys: [],
        recency: 0.75,
        recencyBoost: true,
      }),
    );
  }
  return entries;
}

function retrievePreferences(
  strategy: AiAgentMemoryStrategy | null | undefined,
  enabled: boolean,
): AiMemoryEntry[] {
  if (!enabled || !strategy) return [];
  return [
    buildEntry({
      id: makeId("preference", "memory-mode"),
      type: "preference",
      scope: "user",
      summary: `Memory preference: ${sanitizeMemoryText(strategy.memoryMode, 40)}; depth=${sanitizeMemoryText(strategy.historyDepth, 20)}`,
      source: "preference-signals",
      tags: ["preference", "memory-strategy"],
      permissionKeys: ["ai:use"],
      recency: 0.5,
    }),
  ];
}

function retrieveBusiness(input: {
  readonly query?: AiBusinessQuery | null;
  readonly decision?: AiBusinessDecision | null;
  readonly execution?: AiBusinessExecution | null;
  readonly enabled: boolean;
}): AiMemoryEntry[] {
  if (!input.enabled) return [];
  const entries: AiMemoryEntry[] = [];

  if (input.query?.intent) {
    entries.push(
      buildEntry({
        id: makeId("business", "query"),
        type: "business",
        scope: "request",
        summary: `Business query intent: ${sanitizeMemoryText(String(input.query.intent), 60)}`,
        source: "business-signals",
        tags: ["business", "query"],
        permissionKeys: ["ai:use"],
        recency: 0.8,
        businessSignal: true,
      }),
    );
  }

  if (input.decision?.reasoningSummary) {
    entries.push(
      buildEntry({
        id: makeId("business", "decision"),
        type: "business",
        scope: "request",
        summary: `Business decision: ${sanitizeMemoryText(input.decision.reasoningSummary, 100)}`,
        source: "business-signals",
        tags: ["business", "decision"],
        permissionKeys: ["ai:use"],
        recency: 0.85,
        businessSignal: true,
      }),
    );
  }

  if (input.execution?.summary) {
    entries.push(
      buildEntry({
        id: makeId("business", "execution"),
        type: "business",
        scope: "request",
        summary: `Execution plan: ${sanitizeMemoryText(input.execution.summary, 100)}`,
        source: "business-signals",
        tags: ["business", "execution"],
        permissionKeys: ["ai:use"],
        recency: 0.9,
        businessSignal: true,
        recencyBoost: true,
      }),
    );
  }

  return entries;
}

function retrieveWorking(
  prompt: string | null | undefined,
  enabled: boolean,
): AiMemoryEntry[] {
  if (!enabled) return [];
  const trimmed = prompt?.trim() ?? "";
  if (!trimmed) return [];
  return [
    buildEntry({
      id: makeId("working", "prompt"),
      type: "working",
      scope: "request",
      summary: `Current request focus: ${sanitizeMemoryText(trimmed, 100)}`,
      source: "working-prompt",
      tags: ["working", "prompt"],
      permissionKeys: [],
      recency: 1,
      recencyBoost: true,
    }),
  ];
}

/**
 * Retrieve immutable runtime memory entries from pipeline signals only.
 */
export function retrieveMemoryEntries(
  input: RetrieveMemoryInput,
): readonly AiMemoryEntry[] {
  const registry = input.registry ?? enterpriseMemoryRegistry;
  const enabled = new Set(
    registry.listEnabled().map((source) => source.id),
  );

  if (input.policy.privacyMode || !input.policy.historyEnabled) {
    // Working + context metadata may still help when history is off,
    // but privacy mode yields nothing (permissions/policies also enforce).
    if (input.policy.privacyMode) {
      return Object.freeze([]);
    }
  }

  const entries: AiMemoryEntry[] = [
    ...retrieveConversation(
      input.conversationHistory ?? [],
      enabled.has("conversation-history") && input.policy.historyEnabled,
    ),
    ...retrieveUser(input.activeContext, enabled.has("user-identity")),
    ...retrieveSession(input.activeContext, enabled.has("session-context")),
    ...retrieveContext(
      input.activeContext,
      input.mode,
      enabled.has("active-context"),
    ),
    ...retrievePreferences(
      input.agentMemoryStrategy,
      enabled.has("preference-signals"),
    ),
    ...retrieveBusiness({
      query: input.businessQuery,
      decision: input.businessDecision,
      execution: input.businessExecution,
      enabled: enabled.has("business-signals"),
    }),
    ...retrieveWorking(input.userPrompt, enabled.has("working-prompt")),
  ];

  return Object.freeze(entries);
}
