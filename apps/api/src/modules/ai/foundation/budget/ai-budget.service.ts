/**
 * Centralized Enterprise AI Cost Budget & Quota Engine.
 * All AI providers must go through this service — no provider-specific budget logic.
 *
 * Pipeline: Request → Budget Validation → Quota Validation → Cost Estimation
 *         → Provider → Actual Usage → Budget Update → Audit
 */

import { randomUUID } from "node:crypto";

import { writeAuditLogSafe } from "../../../../shared/security/write-audit-log.js";
import { securityMonitoringService } from "../../../../shared/security/monitoring/index.js";
import { THREAT_DETECTION_TYPES } from "../../../../shared/security/monitoring/monitoring.types.js";
import { getAiBudgetConfig, isAiBudgetEnabled } from "./ai-budget.config.js";
import {
  estimateCostUsd,
  estimateTokensFromText,
  estimateUsageFromTexts,
  periodKeyForType,
  roundUsd,
} from "./ai-budget.pricing.js";
import {
  buildBudgetId,
  getBudgetLedger,
  listMemoryBudgetLedgers,
  saveBudgetLedger,
} from "./ai-budget.store.js";
import {
  AI_BUDGET_ALERT_THRESHOLDS,
  AI_BUDGET_AUDIT,
  emptyUsageCounters,
  type AiBudgetActor,
  type AiBudgetAlertThreshold,
  type AiBudgetDefinition,
  type AiBudgetLedger,
  type AiBudgetLevel,
  type AiBudgetLimitAction,
  type AiBudgetRecordUsageInput,
  type AiBudgetRecordUsageResult,
  type AiBudgetRequestContext,
  type AiBudgetTokenUsage,
  type AiBudgetType,
  type AiBudgetUsageCounters,
  type AiBudgetValidationResult,
} from "./ai-budget.types.js";

const TTL_MONTH_MS = 45 * 86_400_000;
const TTL_DAY_MS = 3 * 86_400_000;

function ttlForType(type: AiBudgetType): number {
  return type === "DAILY" || type === "REQUEST" ? TTL_DAY_MS : TTL_MONTH_MS;
}

/** Never log prompts or completion content. */
function safeBudgetMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const safe = { ...metadata };
  delete safe.prompt;
  delete safe.message;
  delete safe.content;
  delete safe.completion;
  delete safe.history;
  delete safe.systemPrompt;
  return safe;
}

async function auditBudgetEvent(input: {
  actor?: AiBudgetActor | null;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await writeAuditLogSafe(
    {
      userId: input.actor?.userId ?? null,
      action: input.action,
      resource: "ai_budget",
      resourceId: input.resourceId ?? null,
      metadata: safeBudgetMetadata(input.metadata ?? {}),
      ipAddress: input.actor?.ipAddress ?? null,
      userAgent: input.actor?.userAgent ?? null,
    },
    "ai",
  );
}

function utilizationPercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.round((used / limit) * 10_000) / 100;
}

function metricForType(
  type: AiBudgetType,
  usage: AiBudgetUsageCounters,
): number {
  switch (type) {
    case "MONTHLY":
    case "DAILY":
    case "PROVIDER":
    case "MODEL":
      return usage.actualCostUsd > 0
        ? usage.actualCostUsd
        : usage.estimatedCostUsd;
    case "TOKEN":
      return usage.totalTokens;
    case "REQUEST":
      return usage.requestCount;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function resolveLimitAction(
  utilization: number,
  softPercent: number,
  hardPercent: number,
  graceMode: boolean,
): AiBudgetLimitAction | "ALLOW" {
  if (utilization >= hardPercent) {
    return graceMode ? "HARD_LIMIT" : "BLOCK";
  }
  if (utilization >= softPercent) {
    return "SOFT_LIMIT";
  }
  if (utilization >= 90) {
    return "WARN";
  }
  if (utilization >= 75) {
    return "WARN";
  }
  if (utilization >= 50) {
    return "WARN";
  }
  return "ALLOW";
}

function hasActiveOverride(ledger: AiBudgetLedger): boolean {
  if (!ledger.overrideUntil) return false;
  return Date.parse(ledger.overrideUntil) > Date.now();
}

async function ensureLedger(def: Omit<
  AiBudgetDefinition,
  "id" | "createdAt" | "updatedAt"
> & { id?: string }): Promise<AiBudgetLedger> {
  const id =
    def.id ??
    buildBudgetId({
      level: def.level,
      type: def.type,
      scopeKey: def.scopeKey,
      periodKey: def.periodKey,
      providerId: def.providerId,
      modelId: def.modelId,
    });
  const existing = await getBudgetLedger(id);
  if (existing && existing.periodKey === def.periodKey) {
    return existing;
  }

  const now = new Date().toISOString();
  const ledger: AiBudgetLedger = {
    id,
    level: def.level,
    type: def.type,
    scopeKey: def.scopeKey,
    limit: def.limit,
    softLimitPercent: def.softLimitPercent,
    hardLimitPercent: def.hardLimitPercent,
    graceMode: def.graceMode,
    enabled: def.enabled,
    providerId: def.providerId ?? null,
    modelId: def.modelId ?? null,
    periodKey: def.periodKey,
    createdAt: now,
    updatedAt: now,
    createdById: def.createdById ?? null,
    usage: emptyUsageCounters(),
    lastAlertThreshold: 0,
    softLimitActive: false,
    hardLimitActive: false,
    blocked: false,
    overrideUntil: null,
    overrideById: null,
  };
  await saveBudgetLedger(ledger, ttlForType(def.type));
  await auditBudgetEvent({
    actor: def.createdById
      ? { userId: def.createdById }
      : null,
    action: AI_BUDGET_AUDIT.CREATED,
    resourceId: id,
    metadata: {
      level: def.level,
      type: def.type,
      scopeKey: def.scopeKey,
      limit: def.limit,
      periodKey: def.periodKey,
    },
  });
  return ledger;
}

function buildDefaultBudgets(
  context: AiBudgetRequestContext,
): Array<Omit<AiBudgetDefinition, "id" | "createdAt" | "updatedAt">> {
  const config = getAiBudgetConfig();
  const monthlyPeriod = periodKeyForType("MONTHLY");
  const dailyPeriod = periodKeyForType("DAILY");
  const soft = config.softLimitPercent;
  const hard = config.hardLimitPercent;
  const grace = config.graceMode;
  const defs: Array<
    Omit<AiBudgetDefinition, "id" | "createdAt" | "updatedAt">
  > = [];

  // Global platform monthly + daily cost
  defs.push({
    level: "GLOBAL",
    type: "MONTHLY",
    scopeKey: "platform",
    limit: config.monthlyDefaultBudgetUsd * 10,
    softLimitPercent: soft,
    hardLimitPercent: hard,
    graceMode: grace,
    enabled: true,
    periodKey: monthlyPeriod,
  });
  defs.push({
    level: "GLOBAL",
    type: "DAILY",
    scopeKey: "platform",
    limit: config.dailyDefaultBudgetUsd * 10,
    softLimitPercent: soft,
    hardLimitPercent: hard,
    graceMode: grace,
    enabled: true,
    periodKey: dailyPeriod,
  });

  // Tenant (organization) — falls back to "default" when unknown
  const tenantKey = context.tenantId?.trim() || "default";
  defs.push({
    level: "TENANT",
    type: "MONTHLY",
    scopeKey: tenantKey,
    limit: config.monthlyDefaultBudgetUsd * 5,
    softLimitPercent: soft,
    hardLimitPercent: hard,
    graceMode: grace,
    enabled: true,
    periodKey: monthlyPeriod,
  });

  if (context.departmentId) {
    defs.push({
      level: "DEPARTMENT",
      type: "MONTHLY",
      scopeKey: context.departmentId,
      limit: config.monthlyDefaultBudgetUsd,
      softLimitPercent: soft,
      hardLimitPercent: hard,
      graceMode: grace,
      enabled: true,
      periodKey: monthlyPeriod,
    });
  }

  // User monthly + daily
  defs.push({
    level: "USER",
    type: "MONTHLY",
    scopeKey: context.actor.userId,
    limit: config.monthlyDefaultBudgetUsd,
    softLimitPercent: soft,
    hardLimitPercent: hard,
    graceMode: grace,
    enabled: true,
    periodKey: monthlyPeriod,
    createdById: context.actor.userId,
  });
  defs.push({
    level: "USER",
    type: "DAILY",
    scopeKey: context.actor.userId,
    limit: config.dailyDefaultBudgetUsd,
    softLimitPercent: soft,
    hardLimitPercent: hard,
    graceMode: grace,
    enabled: true,
    periodKey: dailyPeriod,
    createdById: context.actor.userId,
  });

  if (config.monthlyTokenBudget > 0) {
    defs.push({
      level: "USER",
      type: "TOKEN",
      scopeKey: context.actor.userId,
      limit: config.monthlyTokenBudget,
      softLimitPercent: soft,
      hardLimitPercent: hard,
      graceMode: grace,
      enabled: true,
      periodKey: monthlyPeriod,
      createdById: context.actor.userId,
    });
  }

  if (config.dailyRequestBudget > 0) {
    defs.push({
      level: "USER",
      type: "REQUEST",
      scopeKey: context.actor.userId,
      limit: config.dailyRequestBudget,
      softLimitPercent: soft,
      hardLimitPercent: hard,
      graceMode: grace,
      enabled: true,
      periodKey: dailyPeriod,
      createdById: context.actor.userId,
    });
  }

  if (context.projectId) {
    defs.push({
      level: "PROJECT",
      type: "MONTHLY",
      scopeKey: context.projectId,
      limit: config.monthlyDefaultBudgetUsd,
      softLimitPercent: soft,
      hardLimitPercent: hard,
      graceMode: grace,
      enabled: true,
      periodKey: monthlyPeriod,
    });
  }

  if (context.apiKeyId) {
    defs.push({
      level: "API_KEY",
      type: "MONTHLY",
      scopeKey: context.apiKeyId,
      limit: config.monthlyDefaultBudgetUsd * 2,
      softLimitPercent: soft,
      hardLimitPercent: hard,
      graceMode: grace,
      enabled: true,
      periodKey: monthlyPeriod,
    });
  }

  // Provider + model budgets
  defs.push({
    level: "GLOBAL",
    type: "PROVIDER",
    scopeKey: context.providerId,
    limit: config.monthlyDefaultBudgetUsd * 8,
    softLimitPercent: soft,
    hardLimitPercent: hard,
    graceMode: grace,
    enabled: true,
    providerId: context.providerId,
    periodKey: monthlyPeriod,
  });

  if (context.modelId) {
    defs.push({
      level: "GLOBAL",
      type: "MODEL",
      scopeKey: context.modelId,
      limit: config.monthlyDefaultBudgetUsd * 5,
      softLimitPercent: soft,
      hardLimitPercent: hard,
      graceMode: grace,
      enabled: true,
      providerId: context.providerId,
      modelId: context.modelId,
      periodKey: monthlyPeriod,
    });
  }

  return defs;
}

async function reportBudgetThreat(input: {
  type:
    | typeof THREAT_DETECTION_TYPES.AI_BUDGET_WARNING
    | typeof THREAT_DETECTION_TYPES.AI_BUDGET_SOFT_LIMIT
    | typeof THREAT_DETECTION_TYPES.AI_BUDGET_EXCEEDED
    | typeof THREAT_DETECTION_TYPES.AI_BUDGET_BLOCKED
    | typeof THREAT_DETECTION_TYPES.AI_COST_ANOMALY;
  actor: AiBudgetActor;
  budgetId: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  void securityMonitoringService.report({
    type: input.type,
    userId: input.actor.userId,
    resource: "ai_budget",
    resourceId: input.budgetId,
    message: input.message,
    metadata: safeBudgetMetadata(input.metadata ?? {}),
    ipAddress: input.actor.ipAddress,
    userAgent: input.actor.userAgent,
  });
}

export class AiBudgetService {
  isEnabled(): boolean {
    return isAiBudgetEnabled();
  }

  /**
   * Ensure default budgets exist for the request scopes (idempotent).
   */
  async ensureDefaultBudgets(
    context: AiBudgetRequestContext,
  ): Promise<AiBudgetLedger[]> {
    const defs = buildDefaultBudgets(context);
    const ledgers: AiBudgetLedger[] = [];
    for (const def of defs) {
      ledgers.push(await ensureLedger(def));
    }
    return ledgers;
  }

  /**
   * Manual budget create / update (audited). Never stores prompts.
   */
  async upsertBudget(
    input: {
      level: AiBudgetLevel;
      type: AiBudgetType;
      scopeKey: string;
      limit: number;
      providerId?: string | null;
      modelId?: string | null;
      softLimitPercent?: number;
      hardLimitPercent?: number;
      graceMode?: boolean;
      enabled?: boolean;
    },
    actor: AiBudgetActor,
  ): Promise<AiBudgetLedger> {
    const config = getAiBudgetConfig();
    const periodKey = periodKeyForType(
      input.type === "DAILY" || input.type === "REQUEST" ? "DAILY" : "MONTHLY",
    );
    const ledger = await ensureLedger({
      level: input.level,
      type: input.type,
      scopeKey: input.scopeKey,
      limit: input.limit,
      softLimitPercent: input.softLimitPercent ?? config.softLimitPercent,
      hardLimitPercent: input.hardLimitPercent ?? config.hardLimitPercent,
      graceMode: input.graceMode ?? config.graceMode,
      enabled: input.enabled ?? true,
      providerId: input.providerId,
      modelId: input.modelId,
      periodKey,
      createdById: actor.userId,
    });

    const updated: AiBudgetLedger = {
      ...ledger,
      limit: input.limit,
      softLimitPercent: input.softLimitPercent ?? ledger.softLimitPercent,
      hardLimitPercent: input.hardLimitPercent ?? ledger.hardLimitPercent,
      graceMode: input.graceMode ?? ledger.graceMode,
      enabled: input.enabled ?? ledger.enabled,
      updatedAt: new Date().toISOString(),
    };
    await saveBudgetLedger(updated, ttlForType(updated.type));
    await auditBudgetEvent({
      actor,
      action: AI_BUDGET_AUDIT.UPDATED,
      resourceId: updated.id,
      metadata: {
        level: updated.level,
        type: updated.type,
        limit: updated.limit,
      },
    });
    return updated;
  }

  async resetBudget(
    budgetId: string,
    actor: AiBudgetActor,
  ): Promise<AiBudgetLedger | null> {
    const ledger = await getBudgetLedger(budgetId);
    if (!ledger) return null;
    const reset: AiBudgetLedger = {
      ...ledger,
      usage: emptyUsageCounters(),
      lastAlertThreshold: 0,
      softLimitActive: false,
      hardLimitActive: false,
      blocked: false,
      updatedAt: new Date().toISOString(),
    };
    await saveBudgetLedger(reset, ttlForType(reset.type));
    await auditBudgetEvent({
      actor,
      action: AI_BUDGET_AUDIT.RESET,
      resourceId: budgetId,
      metadata: { level: ledger.level, type: ledger.type },
    });
    return reset;
  }

  /**
   * Super Admin (or elevated) temporary override — always audited.
   */
  async grantOverride(input: {
    budgetId: string;
    actor: AiBudgetActor;
    durationMs?: number;
  }): Promise<AiBudgetLedger | null> {
    const ledger = await getBudgetLedger(input.budgetId);
    if (!ledger) return null;
    const until = new Date(
      Date.now() + (input.durationMs ?? 60 * 60 * 1000),
    ).toISOString();
    const updated: AiBudgetLedger = {
      ...ledger,
      blocked: false,
      hardLimitActive: false,
      overrideUntil: until,
      overrideById: input.actor.userId,
      updatedAt: new Date().toISOString(),
    };
    await saveBudgetLedger(updated, ttlForType(updated.type));
    await auditBudgetEvent({
      actor: input.actor,
      action: AI_BUDGET_AUDIT.OVERRIDE,
      resourceId: input.budgetId,
      metadata: { overrideUntil: until },
    });
    return updated;
  }

  /**
   * Pre-provider gate: budget + quota validation + cost estimation.
   */
  async validateRequest(
    context: AiBudgetRequestContext,
  ): Promise<AiBudgetValidationResult> {
    if (!this.isEnabled()) {
      return {
        allowed: true,
        action: "ALLOW",
        graceApplied: false,
        estimatedCostUsd: 0,
        estimatedTokens: 0,
        budgetsChecked: [],
        warnings: [],
        utilizationPercent: 0,
        metadata: { budgetEnabled: false },
      };
    }

    const config = getAiBudgetConfig();
    const promptTokens = Math.max(0, context.estimatedPromptTokens ?? 0);
    const completionTokens = Math.max(
      0,
      context.estimatedCompletionTokens ?? config.defaultCompletionEstimate,
    );
    const estimatedCostUsd = estimateCostUsd({
      providerId: context.providerId,
      modelId: context.modelId,
      promptTokens,
      completionTokens,
    });
    const estimatedTokens = promptTokens + completionTokens;

    const ledgers = await this.ensureDefaultBudgets(context);
    const warnings: string[] = [];
    let worstAction: AiBudgetLimitAction | "ALLOW" = "ALLOW";
    let blockingBudgetId: string | undefined;
    let blockingLevel: AiBudgetLevel | undefined;
    let maxUtilization = 0;
    let graceApplied = false;
    const budgetsChecked: string[] = [];

    for (const ledger of ledgers) {
      if (!ledger.enabled) continue;
      budgetsChecked.push(ledger.id);

      if (hasActiveOverride(ledger)) {
        warnings.push(`Override active on ${ledger.id}`);
        continue;
      }

      // Projected usage including this request
      const projectedUsage: AiBudgetUsageCounters = {
        ...ledger.usage,
        estimatedCostUsd: roundUsd(
          ledger.usage.estimatedCostUsd + estimatedCostUsd,
        ),
        actualCostUsd: ledger.usage.actualCostUsd,
        totalTokens: ledger.usage.totalTokens + estimatedTokens,
        requestCount: ledger.usage.requestCount + 1,
        promptTokens: ledger.usage.promptTokens + promptTokens,
        completionTokens: ledger.usage.completionTokens + completionTokens,
        cachedTokens: ledger.usage.cachedTokens,
      };

      const used = metricForType(ledger.type, projectedUsage);
      const utilization = utilizationPercent(used, ledger.limit);
      maxUtilization = Math.max(maxUtilization, utilization);

      const action = resolveLimitAction(
        utilization,
        ledger.softLimitPercent,
        ledger.hardLimitPercent,
        ledger.graceMode,
      );

      if (action === "WARN" || action === "SOFT_LIMIT") {
        warnings.push(
          `${ledger.level}/${ledger.type} at ${utilization}% (${action})`,
        );
      }

      if (action === "HARD_LIMIT") {
        graceApplied = true;
        warnings.push(
          `${ledger.level}/${ledger.type} hard limit — grace mode allows request`,
        );
        await reportBudgetThreat({
          type: THREAT_DETECTION_TYPES.AI_BUDGET_EXCEEDED,
          actor: context.actor,
          budgetId: ledger.id,
          message: "AI budget hard limit reached (grace mode)",
          metadata: {
            utilization,
            level: ledger.level,
            type: ledger.type,
            graceMode: true,
          },
        });
      }

      if (action === "BLOCK") {
        worstAction = "BLOCK";
        blockingBudgetId = ledger.id;
        blockingLevel = ledger.level;
        await auditBudgetEvent({
          actor: context.actor,
          action: AI_BUDGET_AUDIT.BLOCKED,
          resourceId: ledger.id,
          metadata: {
            utilization,
            level: ledger.level,
            type: ledger.type,
            estimatedCostUsd,
          },
        });
        await reportBudgetThreat({
          type: THREAT_DETECTION_TYPES.AI_BUDGET_BLOCKED,
          actor: context.actor,
          budgetId: ledger.id,
          message: "AI request blocked by budget policy",
          metadata: {
            utilization,
            level: ledger.level,
            type: ledger.type,
          },
        });
        break;
      }

      const rank: Record<AiBudgetLimitAction | "ALLOW", number> = {
        ALLOW: 0,
        WARN: 1,
        SOFT_LIMIT: 2,
        HARD_LIMIT: 3,
        BLOCK: 4,
      };
      if (rank[action] > rank[worstAction]) {
        worstAction = action;
      }
    }

    const allowed = worstAction !== "BLOCK";

    return {
      allowed,
      action: worstAction,
      graceApplied,
      estimatedCostUsd,
      estimatedTokens,
      budgetsChecked,
      warnings,
      blockingBudgetId,
      blockingLevel,
      utilizationPercent: maxUtilization,
      metadata: {
        providerId: context.providerId,
        modelId: context.modelId ?? null,
        reservationId: randomUUID(),
      },
    };
  }

  /**
   * Assert budget allows the request; throws AiBudgetBlockedError on BLOCK.
   */
  async assertWithinBudget(
    context: AiBudgetRequestContext,
  ): Promise<AiBudgetValidationResult> {
    const result = await this.validateRequest(context);
    if (!result.allowed) {
      throw new AiBudgetBlockedError(
        "AI budget limit exceeded. Try again later or contact an administrator.",
        result,
      );
    }

    if (result.action === "WARN" || result.action === "SOFT_LIMIT") {
      const threatType =
        result.action === "SOFT_LIMIT"
          ? THREAT_DETECTION_TYPES.AI_BUDGET_SOFT_LIMIT
          : THREAT_DETECTION_TYPES.AI_BUDGET_WARNING;
      void reportBudgetThreat({
        type: threatType,
        actor: context.actor,
        budgetId: result.blockingBudgetId ?? result.budgetsChecked[0] ?? "n/a",
        message: `AI budget ${result.action.toLowerCase()}`,
        metadata: {
          utilization: result.utilizationPercent,
          warnings: result.warnings,
        },
      });
    }

    return result;
  }

  /**
   * Post-provider: record actual usage, fire threshold alerts, update ledgers.
   */
  async recordUsage(
    input: AiBudgetRecordUsageInput,
  ): Promise<AiBudgetRecordUsageResult> {
    if (!this.isEnabled()) {
      return {
        updatedBudgetIds: [],
        alertsFired: [],
        actions: [],
        metadata: { budgetEnabled: false },
      };
    }

    const ledgers = await this.ensureDefaultBudgets(input.context);
    const updatedBudgetIds: string[] = [];
    const alertsFired: AiBudgetAlertThreshold[] = [];
    const actions: AiBudgetLimitAction[] = [];

    // Cost anomaly: actual >> estimate
    if (
      input.estimatedCostUsd > 0 &&
      input.actualCostUsd > input.estimatedCostUsd * 5
    ) {
      void reportBudgetThreat({
        type: THREAT_DETECTION_TYPES.AI_COST_ANOMALY,
        actor: input.context.actor,
        budgetId: "cost-anomaly",
        message: "AI actual cost significantly exceeds estimate",
        metadata: {
          estimatedCostUsd: input.estimatedCostUsd,
          actualCostUsd: input.actualCostUsd,
          providerId: input.context.providerId,
        },
      });
    }

    for (const ledger of ledgers) {
      if (!ledger.enabled) continue;

      const nextUsage: AiBudgetUsageCounters = {
        promptTokens: ledger.usage.promptTokens + input.usage.promptTokens,
        completionTokens:
          ledger.usage.completionTokens + input.usage.completionTokens,
        cachedTokens: ledger.usage.cachedTokens + input.usage.cachedTokens,
        totalTokens: ledger.usage.totalTokens + input.usage.totalTokens,
        estimatedCostUsd: roundUsd(
          ledger.usage.estimatedCostUsd + input.estimatedCostUsd,
        ),
        actualCostUsd: roundUsd(
          ledger.usage.actualCostUsd + input.actualCostUsd,
        ),
        requestCount: ledger.usage.requestCount + 1,
      };

      const used = metricForType(ledger.type, nextUsage);
      const utilization = utilizationPercent(used, ledger.limit);
      let lastAlert = ledger.lastAlertThreshold;
      let softLimitActive = ledger.softLimitActive;
      let hardLimitActive = ledger.hardLimitActive;
      let blocked = ledger.blocked;

      for (const threshold of AI_BUDGET_ALERT_THRESHOLDS) {
        if (utilization >= threshold && lastAlert < threshold) {
          alertsFired.push(threshold);
          lastAlert = threshold;
          const threatType =
            threshold >= 100
              ? THREAT_DETECTION_TYPES.AI_BUDGET_EXCEEDED
              : threshold >= ledger.softLimitPercent
                ? THREAT_DETECTION_TYPES.AI_BUDGET_SOFT_LIMIT
                : THREAT_DETECTION_TYPES.AI_BUDGET_WARNING;
          void reportBudgetThreat({
            type: threatType,
            actor: input.context.actor,
            budgetId: ledger.id,
            message: `AI budget reached ${threshold}%`,
            metadata: {
              threshold,
              utilization,
              level: ledger.level,
              type: ledger.type,
            },
          });
        }
      }

      const action = resolveLimitAction(
        utilization,
        ledger.softLimitPercent,
        ledger.hardLimitPercent,
        ledger.graceMode,
      );
      if (action !== "ALLOW") actions.push(action);
      if (action === "SOFT_LIMIT") softLimitActive = true;
      if (action === "HARD_LIMIT" || action === "BLOCK") {
        hardLimitActive = true;
        if (action === "BLOCK" && !hasActiveOverride(ledger)) {
          blocked = true;
        }
        await auditBudgetEvent({
          actor: input.context.actor,
          action: AI_BUDGET_AUDIT.LIMIT_EXCEEDED,
          resourceId: ledger.id,
          metadata: {
            action,
            utilization,
            level: ledger.level,
            type: ledger.type,
          },
        });
      }

      const updated: AiBudgetLedger = {
        ...ledger,
        usage: nextUsage,
        lastAlertThreshold: lastAlert,
        softLimitActive,
        hardLimitActive,
        blocked,
        updatedAt: new Date().toISOString(),
      };
      await saveBudgetLedger(updated, ttlForType(updated.type));
      updatedBudgetIds.push(updated.id);
    }

    await auditBudgetEvent({
      actor: input.context.actor,
      action: AI_BUDGET_AUDIT.USAGE_RECORDED,
      resourceId: input.context.conversationId ?? undefined,
      metadata: {
        providerId: input.context.providerId,
        modelId: input.context.modelId ?? null,
        promptTokens: input.usage.promptTokens,
        completionTokens: input.usage.completionTokens,
        cachedTokens: input.usage.cachedTokens,
        totalTokens: input.usage.totalTokens,
        estimatedCostUsd: input.estimatedCostUsd,
        actualCostUsd: input.actualCostUsd,
        requestCount: 1,
        // Never include prompt text
      },
    });

    return {
      updatedBudgetIds,
      alertsFired: [...new Set(alertsFired)],
      actions: [...new Set(actions)],
      metadata: {
        utilizationAlerts: alertsFired,
      },
    };
  }

  /**
   * Helper for AiService: estimate from generate params (no prompt stored).
   */
  estimateFromGenerateParams(input: {
    providerId: string;
    modelId?: string | null;
    prompt: string;
    history?: Array<{ content: string }>;
    completionText?: string;
  }): { usage: AiBudgetTokenUsage; estimatedCostUsd: number } {
    const config = getAiBudgetConfig();
    return estimateUsageFromTexts({
      providerId: input.providerId,
      modelId: input.modelId,
      promptText: input.prompt,
      historyTexts: (input.history ?? []).map((h) => h.content),
      completionText: input.completionText,
      completionEstimate: input.completionText
        ? undefined
        : config.defaultCompletionEstimate,
    });
  }

  listBudgets(): AiBudgetLedger[] {
    return listMemoryBudgetLedgers();
  }
}

export class AiBudgetBlockedError extends Error {
  readonly statusCode = 429;
  readonly code = "AI_BUDGET_EXCEEDED";
  readonly validation: AiBudgetValidationResult;

  constructor(message: string, validation: AiBudgetValidationResult) {
    super(message);
    this.name = "AiBudgetBlockedError";
    this.validation = validation;
  }
}

export const aiBudgetService = new AiBudgetService();

/** Re-export helpers used by stages */
export { estimateTokensFromText, estimateCostUsd };
