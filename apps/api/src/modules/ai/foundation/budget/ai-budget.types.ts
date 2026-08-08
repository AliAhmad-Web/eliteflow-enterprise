/**
 * Enterprise AI Cost Budget & Quota Engine — types.
 * No Prisma / DTO redesign. Budget state is store-backed.
 */

export const AI_BUDGET_LEVELS = [
  "GLOBAL",
  "TENANT",
  "DEPARTMENT",
  "USER",
  "PROJECT",
  "API_KEY",
] as const;

export type AiBudgetLevel = (typeof AI_BUDGET_LEVELS)[number];

export const AI_BUDGET_TYPES = [
  "MONTHLY",
  "DAILY",
  "TOKEN",
  "REQUEST",
  "PROVIDER",
  "MODEL",
] as const;

export type AiBudgetType = (typeof AI_BUDGET_TYPES)[number];

export const AI_BUDGET_LIMIT_ACTIONS = [
  "WARN",
  "SOFT_LIMIT",
  "HARD_LIMIT",
  "BLOCK",
] as const;

export type AiBudgetLimitAction = (typeof AI_BUDGET_LIMIT_ACTIONS)[number];

export const AI_BUDGET_ALERT_THRESHOLDS = [50, 75, 90, 100, 110] as const;

export type AiBudgetAlertThreshold =
  (typeof AI_BUDGET_ALERT_THRESHOLDS)[number];

export const AI_BUDGET_AUDIT = {
  CREATED: "ai.budget.created",
  UPDATED: "ai.budget.updated",
  RESET: "ai.budget.reset",
  OVERRIDE: "ai.budget.override",
  LIMIT_EXCEEDED: "ai.budget.limit_exceeded",
  USAGE_RECORDED: "ai.budget.usage_recorded",
  BLOCKED: "ai.budget.blocked",
} as const;

export type AiBudgetAuditAction =
  (typeof AI_BUDGET_AUDIT)[keyof typeof AI_BUDGET_AUDIT];

/** Provider-independent token usage snapshot. */
export interface AiBudgetTokenUsage {
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  totalTokens: number;
}

/** Cost figures in USD (provider-independent pricing table). */
export interface AiBudgetCostSnapshot {
  estimatedCostUsd: number;
  actualCostUsd: number;
}

export interface AiBudgetUsageCounters {
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  actualCostUsd: number;
  requestCount: number;
}

export interface AiBudgetDefinition {
  id: string;
  level: AiBudgetLevel;
  type: AiBudgetType;
  /** Scope key: e.g. userId, departmentId, "global", provider id, model id */
  scopeKey: string;
  /** Soft/hard ceilings (USD for cost budgets, tokens/requests for quota types). */
  limit: number;
  softLimitPercent: number;
  hardLimitPercent: number;
  graceMode: boolean;
  enabled: boolean;
  /** Optional provider/model filters for PROVIDER / MODEL budgets. */
  providerId?: string | null;
  modelId?: string | null;
  periodKey: string;
  createdAt: string;
  updatedAt: string;
  createdById?: string | null;
}

export interface AiBudgetLedger extends AiBudgetDefinition {
  usage: AiBudgetUsageCounters;
  /** Highest alert threshold already fired this period. */
  lastAlertThreshold: number;
  /** Soft-limit warnings already emitted. */
  softLimitActive: boolean;
  hardLimitActive: boolean;
  blocked: boolean;
  overrideUntil?: string | null;
  overrideById?: string | null;
}

export interface AiBudgetActor {
  userId: string;
  role?: string | null;
  email?: string | null;
  permissions?: readonly string[];
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AiBudgetRequestContext {
  actor: AiBudgetActor;
  providerId: string;
  modelId?: string | null;
  /** Optional scopes when known (no tenant isolation redesign). */
  tenantId?: string | null;
  departmentId?: string | null;
  projectId?: string | null;
  apiKeyId?: string | null;
  conversationId?: string | null;
  surface?: string | null;
  /** Estimated prompt size for pre-flight cost. */
  estimatedPromptTokens?: number;
  estimatedCompletionTokens?: number;
}

export interface AiBudgetValidationResult {
  allowed: boolean;
  action: AiBudgetLimitAction | "ALLOW";
  graceApplied: boolean;
  estimatedCostUsd: number;
  estimatedTokens: number;
  budgetsChecked: string[];
  warnings: string[];
  blockingBudgetId?: string;
  blockingLevel?: AiBudgetLevel;
  utilizationPercent: number;
  metadata: Record<string, unknown>;
}

export interface AiBudgetRecordUsageInput {
  context: AiBudgetRequestContext;
  usage: AiBudgetTokenUsage;
  estimatedCostUsd: number;
  actualCostUsd: number;
  reservationId?: string | null;
}

export interface AiBudgetRecordUsageResult {
  updatedBudgetIds: string[];
  alertsFired: AiBudgetAlertThreshold[];
  actions: AiBudgetLimitAction[];
  metadata: Record<string, unknown>;
}

export function emptyUsageCounters(): AiBudgetUsageCounters {
  return {
    promptTokens: 0,
    completionTokens: 0,
    cachedTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
    actualCostUsd: 0,
    requestCount: 0,
  };
}
