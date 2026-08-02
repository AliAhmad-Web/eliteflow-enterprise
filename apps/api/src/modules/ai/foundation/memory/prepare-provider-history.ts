import type { AiEffectivePolicy } from "../contracts/ai-effective-policy.js";
import type { AiMemoryMessage } from "../contracts/ai-memory-message.js";
import type {
  AiAgentMemoryStrategy,
  AiAgentHistoryDepth,
  AiAgentContextWindowPreference,
} from "../agents/ai-agent-memory-strategy.js";

const DEFAULT_MAX_MESSAGES = 40;
const DEFAULT_MAX_HISTORY_TOKENS = 12_000;

const DEPTH_MAX_MESSAGES: Readonly<Record<AiAgentHistoryDepth, number>> = {
  short: 12,
  medium: 40,
  long: 80,
  full: Number.POSITIVE_INFINITY,
};

const WINDOW_TOKEN_MULTIPLIER: Readonly<
  Record<AiAgentContextWindowPreference, number>
> = {
  compact: 0.5,
  balanced: 1,
  extended: 2,
};

const RUNTIME_MESSAGE_RE =
  /\b(runtime\s+instructions?|active\s+agent|execution\s+policy|temperature\s+preference)\b/i;
const TOOL_RESULT_MESSAGE_RE =
  /\b(tool\s+result|tool\s+execution|allowed\s+tools|tool\s+output)\b/i;
const BUSINESS_CONTEXT_MESSAGE_RE =
  /\b(business\s+context|entity\s+focus|organization\s+context)\b/i;
const SENSITIVE_CONTENT_RE =
  /\b(api[_-]?key|secret|password|token|bearer\s+[a-z0-9._\-]+|sk-[a-z0-9]+)\b/i;

function parsePositiveInt(
  raw: string | undefined,
  fallback: number,
): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Ops: AI_HISTORY_WINDOW=0 disables sliding truncation (policy flags still apply). */
export function isAiHistoryWindowUnlimited(): boolean {
  return process.env.AI_HISTORY_WINDOW?.trim() === "0";
}

function estimateTokens(content: string): number {
  return Math.max(1, Math.ceil(content.length / 4));
}

function resolveMaxMessages(): number {
  return parsePositiveInt(
    process.env.AI_HISTORY_MAX_MESSAGES,
    DEFAULT_MAX_MESSAGES,
  );
}

function resolveTokenBudget(policy: AiEffectivePolicy): number {
  if (policy.maxTokens != null && policy.maxTokens > 0) {
    return Math.max(1024, policy.maxTokens * 2);
  }
  return parsePositiveInt(
    process.env.AI_HISTORY_MAX_TOKENS,
    DEFAULT_MAX_HISTORY_TOKENS,
  );
}

function resolveStrategyMaxMessages(
  strategy: AiAgentMemoryStrategy,
): number {
  const depthCap = DEPTH_MAX_MESSAGES[strategy.historyDepth];
  if (!Number.isFinite(depthCap)) {
    return Number.POSITIVE_INFINITY;
  }
  return depthCap;
}

function resolveStrategyTokenBudget(
  policy: AiEffectivePolicy,
  strategy: AiAgentMemoryStrategy,
): number {
  const base = resolveTokenBudget(policy);
  const multiplier = WINDOW_TOKEN_MULTIPLIER[strategy.contextWindowPreference];
  return Math.max(512, Math.floor(base * multiplier));
}

function isRuntimeMessage(message: AiMemoryMessage): boolean {
  return RUNTIME_MESSAGE_RE.test(message.content);
}

function isToolResultMessage(message: AiMemoryMessage): boolean {
  return TOOL_RESULT_MESSAGE_RE.test(message.content);
}

function isBusinessContextMessage(message: AiMemoryMessage): boolean {
  return BUSINESS_CONTEXT_MESSAGE_RE.test(message.content);
}

/**
 * Filter prior turns using memory strategy retention flags.
 * USER messages are never removed or modified.
 */
function applyRetentionFilters(
  messages: readonly AiMemoryMessage[],
  strategy: AiAgentMemoryStrategy,
): AiMemoryMessage[] {
  const retainRuntime =
    strategy.privacyBehavior === "strict"
      ? false
      : strategy.retainRuntimeMessages;
  const retainToolResults = strategy.retainToolResults;
  const retainBusiness =
    strategy.privacyBehavior === "strict"
      ? false
      : strategy.retainBusinessContext;

  return messages.filter((message) => {
    if (message.role === "USER") return true;

    if (message.role === "SYSTEM" && !strategy.retainSystemMessages) {
      return false;
    }

    if (!retainRuntime && isRuntimeMessage(message)) return false;
    if (!retainToolResults && isToolResultMessage(message)) return false;
    if (!retainBusiness && isBusinessContextMessage(message)) return false;

    return true;
  });
}

/**
 * Strip sensitive non-user content when privacy behavior is strict.
 * Never alters USER message content.
 */
function applyPrivacySanitization(
  messages: readonly AiMemoryMessage[],
  strategy: AiAgentMemoryStrategy,
): AiMemoryMessage[] {
  if (strategy.privacyBehavior !== "strict") {
    return [...messages];
  }

  return messages.map((message) => {
    if (message.role === "USER") return message;
    if (!SENSITIVE_CONTENT_RE.test(message.content)) return message;
    return {
      role: message.role,
      content: message.content.replace(SENSITIVE_CONTENT_RE, "[redacted]"),
    };
  });
}

/**
 * Compact older turns when over summarizeThreshold.
 * Inserts a single SYSTEM placeholder when system messages are retained.
 * USER message content is never rewritten.
 */
function applySummarizeThreshold(
  messages: readonly AiMemoryMessage[],
  strategy: AiAgentMemoryStrategy,
): AiMemoryMessage[] {
  const threshold = strategy.summarizeThreshold;
  if (
    !Number.isFinite(threshold) ||
    threshold <= 0 ||
    messages.length <= threshold
  ) {
    return [...messages];
  }

  const keepCount = Math.max(1, threshold);
  const omitted = messages.length - keepCount;
  const kept = messages.slice(-keepCount);

  if (!strategy.retainSystemMessages || omitted <= 0) {
    return kept;
  }

  return [
    {
      role: "SYSTEM",
      content: `Prior conversation compacted (${omitted} earlier turn(s) omitted).`,
    },
    ...kept,
  ];
}

/**
 * Apply sliding window from newest → oldest, then restore chronological order.
 * No summarization — oldest turns are dropped when over budget.
 */
export function applySlidingWindow(
  messages: readonly AiMemoryMessage[],
  policy: AiEffectivePolicy,
  options?: {
    readonly maxMessages?: number;
    readonly tokenBudget?: number;
  },
): AiMemoryMessage[] {
  if (messages.length === 0) return [];
  if (isAiHistoryWindowUnlimited()) return [...messages];

  const maxMessages = options?.maxMessages ?? resolveMaxMessages();
  const tokenBudget = options?.tokenBudget ?? resolveTokenBudget(policy);
  const messageCap = Number.isFinite(maxMessages)
    ? maxMessages
    : Number.MAX_SAFE_INTEGER;

  const kept: AiMemoryMessage[] = [];
  let tokens = 0;

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]!;
    if (kept.length >= messageCap) break;

    const cost = estimateTokens(message.content);
    if (kept.length > 0 && tokens + cost > tokenBudget) break;

    kept.push(message);
    tokens += cost;
  }

  kept.reverse();
  return kept;
}

export interface PrepareProviderHistoryInput {
  readonly conversationHistory: readonly AiMemoryMessage[];
  readonly policy: AiEffectivePolicy;
  /**
   * Optional agent memory strategy. When absent, legacy sliding-window
   * behavior is preserved exactly.
   */
  readonly agentMemoryStrategy?: AiAgentMemoryStrategy | null;
}

/**
 * Build provider-ready history from prior turns + effective policy.
 * - historyEnabled=false → []
 * - privacyMode=true → [] (no prior turns egressed)
 * - else sliding window over conversationHistory
 * - when agentMemoryStrategy is set: retention, depth, and compact rules apply
 *
 * Current user message remains the generate `prompt` (not part of history).
 * USER messages in history are never modified.
 */
export function prepareProviderHistory(
  input: PrepareProviderHistoryInput,
): AiMemoryMessage[] {
  const { conversationHistory, policy, agentMemoryStrategy } = input;

  if (!policy.historyEnabled || policy.privacyMode) {
    return [];
  }

  if (!agentMemoryStrategy) {
    return applySlidingWindow(conversationHistory, policy);
  }

  if (agentMemoryStrategy.memoryMode === "minimal") {
    const recentUserTurns = conversationHistory
      .filter((message) => message.role === "USER")
      .slice(-4);
    return applySlidingWindow(recentUserTurns, policy, {
      maxMessages: resolveStrategyMaxMessages(agentMemoryStrategy),
      tokenBudget: resolveStrategyTokenBudget(policy, agentMemoryStrategy),
    });
  }

  const retained = applyRetentionFilters(
    conversationHistory,
    agentMemoryStrategy,
  );
  const sanitized = applyPrivacySanitization(retained, agentMemoryStrategy);
  const compacted = applySummarizeThreshold(sanitized, agentMemoryStrategy);

  return applySlidingWindow(compacted, policy, {
    maxMessages: resolveStrategyMaxMessages(agentMemoryStrategy),
    tokenBudget: resolveStrategyTokenBudget(policy, agentMemoryStrategy),
  });
}
