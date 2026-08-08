/**
 * Enterprise Human Confirmation Engine.
 *
 * AI → Confirmation Engine → User Approval → Execute Tool → Audit
 * Every protected tool must go through this service.
 */

import { createHash, randomBytes, randomUUID } from "node:crypto";

import {
  isApiSecurityMonitoringEnabled,
  isApiZeroTrustEnabled,
  isApiZeroTrustEnforcementEnabled,
} from "../../../../config/security-flags.js";
import { sessionService } from "../../../auth/session/index.js";
import { securityMonitoringService } from "../../../../shared/security/monitoring/index.js";
import { zeroTrustService } from "../../../../shared/security/zero-trust/index.js";
import { writeAuditLogSafe } from "../../../../shared/security/write-audit-log.js";
import { resolveAiActiveContext } from "../context/resolve-active-context.js";
import { resolveAiEffectivePolicy } from "../settings/settings-enforcer.js";
import { aiDataPolicyService } from "../policy/ai-data-policy.service.js";
import { promptSecurityService } from "../security/index.js";
import { AI_TOOL_CATALOG } from "../tools/tool-catalog.js";
import {
  assertToolExecutionAllowed,
  ToolExecutionGuardError,
} from "../tools/tool-execution-guard.js";
import { runRealTool } from "../tools/real-tool-runners.js";
import type { AiToolExecutionContext } from "../tools/tool-execution-context.js";
import { getProtectedActionByToolId } from "./confirmation.catalog.js";
import {
  getAiConfirmationExpirationMinutes,
  isAiConfirmationEnabled,
  isAiConfirmationHighRiskOnly,
} from "./confirmation.config.js";
import {
  getConfirmationRecord,
  saveConfirmationRecord,
  updateConfirmationRecord,
} from "./confirmation.store.js";
import {
  CONFIRMATION_RISK_LEVELS,
  type ApproveConfirmationInput,
  type ConfirmationRequiredPayload,
  type ConfirmationRiskLevel,
  type CreateConfirmationInput,
  type HumanConfirmationRecord,
} from "./confirmation.types.js";

const SENSITIVE_ARG_KEYS = new Set([
  "password",
  "secret",
  "token",
  "apiKey",
  "api_key",
  "accessToken",
  "refreshToken",
  "ssn",
  "salary",
  "compensation",
  "mfaSecret",
  "otp",
  "pin",
]);

const AUDIT_RESOURCE = "ai_confirmation";

export type ConfirmationFailureReason =
  | "DISABLED"
  | "NOT_FOUND"
  | "EXPIRED"
  | "REPLAY"
  | "USER_MISMATCH"
  | "SESSION_MISMATCH"
  | "TENANT_MISMATCH"
  | "ARGUMENT_CHANGED"
  | "RBAC_DENIED"
  | "ZERO_TRUST_DENIED"
  | "SESSION_INVALID"
  | "POLICY_DENIED"
  | "PROMPT_SECURITY_DENIED"
  | "NOT_PENDING"
  | "EXECUTION_FAILED";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`)
    .join(",")}}`;
}

export function hashConfirmationArguments(
  args: Readonly<Record<string, unknown>>,
): string {
  return createHash("sha256").update(stableStringify(args)).digest("hex");
}

function sanitizeArgumentPreview(
  args: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    const lower = key.toLowerCase();
    if (
      SENSITIVE_ARG_KEYS.has(key) ||
      lower.includes("password") ||
      lower.includes("secret") ||
      lower.includes("token") ||
      lower.includes("salary")
    ) {
      out[key] = "[REDACTED]";
      continue;
    }
    if (typeof value === "string") {
      out[key] = value.length > 200 ? `${value.slice(0, 197)}...` : value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    } else if (value === null) {
      out[key] = null;
    } else {
      out[key] = "[omitted]";
    }
  }
  return out;
}

function riskRequiresConfirmation(risk: ConfirmationRiskLevel): boolean {
  if (risk === CONFIRMATION_RISK_LEVELS.CRITICAL) return true;
  if (!isAiConfirmationHighRiskOnly()) return true;
  return risk === CONFIRMATION_RISK_LEVELS.HIGH;
}

function toDialogPayload(
  record: HumanConfirmationRecord,
): ConfirmationRequiredPayload {
  return {
    confirmationRequired: true,
    confirmationId: record.confirmationId,
    expiresAt: new Date(record.expiresAt).toISOString(),
    action: record.action,
    summary: record.summary,
    riskLevel: record.riskLevel,
    toolId: record.toolId,
  };
}

function reportMonitoring(
  type:
    | "CONFIRMATION_CREATED"
    | "CONFIRMATION_APPROVED"
    | "CONFIRMATION_REJECTED"
    | "CONFIRMATION_EXPIRED"
    | "CONFIRMATION_REPLAY"
    | "CONFIRMATION_ARGUMENT_CHANGED",
  input: {
    userId?: string | null;
    resourceId?: string | null;
    message?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): void {
  if (!isApiSecurityMonitoringEnabled()) return;
  const base = {
    userId: input.userId,
    resource: AUDIT_RESOURCE,
    resourceId: input.resourceId,
    message: input.message,
    metadata: {
      ...(input.metadata ?? {}),
      // Never include raw args / tokens
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  };

  switch (type) {
    case "CONFIRMATION_CREATED":
      void securityMonitoringService.reportConfirmationCreated(base);
      break;
    case "CONFIRMATION_APPROVED":
      void securityMonitoringService.reportConfirmationApproved(base);
      break;
    case "CONFIRMATION_REJECTED":
      void securityMonitoringService.reportConfirmationRejected(base);
      break;
    case "CONFIRMATION_EXPIRED":
      void securityMonitoringService.reportConfirmationExpired(base);
      break;
    case "CONFIRMATION_REPLAY":
      void securityMonitoringService.reportConfirmationReplay(base);
      break;
    case "CONFIRMATION_ARGUMENT_CHANGED":
      void securityMonitoringService.reportConfirmationArgumentChanged(base);
      break;
    default: {
      const _exhaustive: never = type;
      void _exhaustive;
      break;
    }
  }
}

async function auditConfirmation(
  action: string,
  input: {
    userId?: string | null;
    confirmationId: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): Promise<void> {
  await writeAuditLogSafe(
    {
      userId: input.userId ?? null,
      action,
      resource: AUDIT_RESOURCE,
      resourceId: input.confirmationId,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
    "ai-confirmation",
  );
}

class HumanConfirmationService {
  isEnabled(): boolean {
    return isAiConfirmationEnabled();
  }

  /**
   * Whether this tool must pause for human approval before side effects.
   */
  requiresConfirmation(toolId: string): boolean {
    if (!this.isEnabled()) return false;
    const def = getProtectedActionByToolId(toolId);
    if (!def) return false;
    return riskRequiresConfirmation(def.riskLevel);
  }

  async createConfirmation(
    input: CreateConfirmationInput,
  ): Promise<ConfirmationRequiredPayload> {
    const def = getProtectedActionByToolId(input.toolId);
    if (!def) {
      throw new Error(`Tool '${input.toolId}' is not a protected action`);
    }

    const args = { ...(input.args ?? {}) };
    const argumentsHash = hashConfirmationArguments(args);
    const confirmationId = randomUUID();
    const rawToken = randomBytes(32).toString("base64url");
    const ttlMinutes = getAiConfirmationExpirationMinutes();
    const ttlMs = ttlMinutes * 60 * 1000;
    const now = Date.now();

    const summaryParts = [def.summaryTemplate];
    const preview = sanitizeArgumentPreview(args);
    const previewKeys = Object.keys(preview).slice(0, 4);
    if (previewKeys.length > 0) {
      summaryParts.push(
        `(${previewKeys
          .map((k) => `${k}=${String(preview[k]).slice(0, 40)}`)
          .join(", ")})`,
      );
    }

    const record: HumanConfirmationRecord = {
      confirmationId,
      tokenHash: hashToken(rawToken),
      userId: input.userId,
      sessionId: input.sessionId ?? null,
      tenantId: input.tenantId ?? null,
      toolId: input.toolId,
      actionKey: def.actionKey,
      action: def.action,
      summary: summaryParts.join(" ").slice(0, 500),
      riskLevel: def.riskLevel,
      argumentsHash,
      argumentPreview: preview,
      argumentsJson: JSON.stringify(args),
      status: "pending",
      createdAt: now,
      expiresAt: now + ttlMs,
      consumedAt: null,
      conversationId: input.conversationId ?? null,
      mode: input.mode ?? null,
      role: input.role ?? null,
      permissions: [...(input.permissions ?? [])],
    };

    await saveConfirmationRecord(record, ttlMs);

    reportMonitoring("CONFIRMATION_CREATED", {
      userId: input.userId,
      resourceId: confirmationId,
      message: `Confirmation created for ${def.action}`,
      metadata: {
        toolId: input.toolId,
        actionKey: def.actionKey,
        riskLevel: def.riskLevel,
        argumentsHash,
      },
    });

    await auditConfirmation("ai.confirmation.created", {
      userId: input.userId,
      confirmationId,
      metadata: {
        toolId: input.toolId,
        actionKey: def.actionKey,
        riskLevel: def.riskLevel,
        argumentsHash,
      },
    });

    return toDialogPayload(record);
  }

  /**
   * Build dialog payload from an existing pending confirmation record.
   */
  toPayload(record: HumanConfirmationRecord): ConfirmationRequiredPayload {
    return toDialogPayload(record);
  }

  async rejectConfirmation(input: ApproveConfirmationInput): Promise<{
    ok: true;
    confirmationId: string;
  }> {
    const record = await getConfirmationRecord(input.confirmationId);
    if (!record) {
      throw confirmationError("NOT_FOUND", "Confirmation not found");
    }

    if (record.userId !== input.userId) {
      throw confirmationError("USER_MISMATCH", "Confirmation user mismatch");
    }

    if (
      record.sessionId &&
      input.sessionId &&
      record.sessionId !== input.sessionId
    ) {
      throw confirmationError(
        "SESSION_MISMATCH",
        "Confirmation session mismatch",
      );
    }

    if (record.status !== "pending") {
      if (record.status === "consumed" || record.status === "approved") {
        reportMonitoring("CONFIRMATION_REPLAY", {
          userId: input.userId,
          resourceId: record.confirmationId,
          message: "Confirmation replay on reject",
          metadata: { status: record.status, toolId: record.toolId },
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        });
        await auditConfirmation("ai.confirmation.replay", {
          userId: input.userId,
          confirmationId: record.confirmationId,
          metadata: { phase: "reject", status: record.status },
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        });
        throw confirmationError("REPLAY", "Confirmation already used");
      }
      throw confirmationError("NOT_PENDING", "Confirmation is not pending");
    }

    if (Date.now() > record.expiresAt) {
      const expired: HumanConfirmationRecord = {
        ...record,
        status: "expired",
      };
      await updateConfirmationRecord(expired, 60_000);
      reportMonitoring("CONFIRMATION_EXPIRED", {
        userId: input.userId,
        resourceId: record.confirmationId,
        message: "Confirmation expired on reject",
        metadata: { toolId: record.toolId },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      throw confirmationError("EXPIRED", "Confirmation has expired");
    }

    const rejected: HumanConfirmationRecord = {
      ...record,
      status: "rejected",
      consumedAt: Date.now(),
    };
    await updateConfirmationRecord(
      rejected,
      Math.max(60_000, rejected.expiresAt - Date.now()),
    );

    reportMonitoring("CONFIRMATION_REJECTED", {
      userId: input.userId,
      resourceId: record.confirmationId,
      message: `Confirmation rejected for ${record.action}`,
      metadata: {
        toolId: record.toolId,
        actionKey: record.actionKey,
        riskLevel: record.riskLevel,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    await auditConfirmation("ai.confirmation.rejected", {
      userId: input.userId,
      confirmationId: record.confirmationId,
      metadata: {
        toolId: record.toolId,
        actionKey: record.actionKey,
        riskLevel: record.riskLevel,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return { ok: true, confirmationId: record.confirmationId };
  }

  async approveConfirmation(input: ApproveConfirmationInput): Promise<{
    ok: true;
    confirmationId: string;
    toolId: string;
    output: Readonly<Record<string, unknown>>;
  }> {
    const record = await getConfirmationRecord(input.confirmationId);
    if (!record) {
      throw confirmationError("NOT_FOUND", "Confirmation not found");
    }

    if (record.userId !== input.userId) {
      throw confirmationError("USER_MISMATCH", "Confirmation user mismatch");
    }

    if (
      record.sessionId &&
      input.sessionId &&
      record.sessionId !== input.sessionId
    ) {
      throw confirmationError(
        "SESSION_MISMATCH",
        "Confirmation session mismatch",
      );
    }

    if (record.status !== "pending") {
      reportMonitoring("CONFIRMATION_REPLAY", {
        userId: input.userId,
        resourceId: record.confirmationId,
        message: "Confirmation replay blocked",
        metadata: { status: record.status, toolId: record.toolId },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      await auditConfirmation("ai.confirmation.replay", {
        userId: input.userId,
        confirmationId: record.confirmationId,
        metadata: { phase: "approve", status: record.status },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      throw confirmationError("REPLAY", "Confirmation already used");
    }

    if (Date.now() > record.expiresAt) {
      const expired: HumanConfirmationRecord = {
        ...record,
        status: "expired",
      };
      await updateConfirmationRecord(expired, 60_000);
      reportMonitoring("CONFIRMATION_EXPIRED", {
        userId: input.userId,
        resourceId: record.confirmationId,
        message: "Confirmation expired",
        metadata: { toolId: record.toolId },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      await auditConfirmation("ai.confirmation.expired", {
        userId: input.userId,
        confirmationId: record.confirmationId,
        metadata: { toolId: record.toolId },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      throw confirmationError("EXPIRED", "Confirmation has expired");
    }

    let parsedArgs: Record<string, unknown>;
    try {
      parsedArgs = JSON.parse(record.argumentsJson) as Record<string, unknown>;
    } catch {
      throw confirmationError("ARGUMENT_CHANGED", "Stored arguments invalid");
    }

    const recomputedHash = hashConfirmationArguments(parsedArgs);
    if (recomputedHash !== record.argumentsHash) {
      reportMonitoring("CONFIRMATION_ARGUMENT_CHANGED", {
        userId: input.userId,
        resourceId: record.confirmationId,
        message: "Confirmation argument hash mismatch",
        metadata: {
          toolId: record.toolId,
          expectedHash: record.argumentsHash,
        },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      await auditConfirmation("ai.confirmation.argument_changed", {
        userId: input.userId,
        confirmationId: record.confirmationId,
        metadata: { toolId: record.toolId },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      throw confirmationError(
        "ARGUMENT_CHANGED",
        "Confirmation arguments were altered",
      );
    }

    // Session revalidation
    if (input.sessionId) {
      try {
        await sessionService.validateSession({
          sessionId: input.sessionId,
          userId: input.userId,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        });
      } catch {
        throw confirmationError("SESSION_INVALID", "Session is no longer valid");
      }
    }

    // Rebuild runtime context for RBAC / policy / tool guards
    const permissions = [
      ...(input.permissions?.length
        ? input.permissions
        : record.permissions),
    ];
    const role = input.role ?? record.role;
    const activeContext = await resolveAiActiveContext({
      userId: input.userId,
      hints: {
        surface: "ASSISTANT",
        module: "ai",
        conversationId: record.conversationId,
        mode: record.mode,
        role,
        permissions,
      },
    });
    const policy = await resolveAiEffectivePolicy({ userId: input.userId });

    const toolContext: AiToolExecutionContext = {
      userId: input.userId,
      role,
      permissions,
      activeContext,
      policy,
      prompt: null,
      mode: record.mode,
    };

    // AI Policy
    try {
      await aiDataPolicyService.assertAIAccess(
        aiDataPolicyService.subjectFrom({
          userId: input.userId,
          role,
          permissions,
        }),
        "ai_surface",
      );
    } catch {
      throw confirmationError("POLICY_DENIED", "AI policy denied execution");
    }

    // Prompt security on tool call
    try {
      promptSecurityService.assertSafeToolCall({
        toolId: record.toolId,
        args: parsedArgs,
        prompt: null,
        context: {
          userId: input.userId,
          surface: "tool",
          toolId: record.toolId,
        },
      });
    } catch {
      throw confirmationError(
        "PROMPT_SECURITY_DENIED",
        "Prompt security denied tool execution",
      );
    }

    // RBAC / tool catalog guards
    const definition = AI_TOOL_CATALOG.find((t) => t.id === record.toolId);
    if (definition) {
      try {
        assertToolExecutionAllowed(definition, toolContext);
      } catch (err) {
        const message =
          err instanceof ToolExecutionGuardError
            ? err.message
            : "RBAC denied tool execution";
        throw confirmationError("RBAC_DENIED", message);
      }
    }

    // Zero Trust recheck
    if (isApiZeroTrustEnabled() && input.sessionId) {
      const zt = await zeroTrustService.evaluateRequestTrust(
        {
          userId: input.userId,
          email: activeContext.user?.email ?? "unknown@eliteflow.local",
          role: role ?? "EMPLOYEE",
          permissions,
          sessionId: input.sessionId,
        },
        {
          path: "/api/ai/tool-confirmations/approve",
          method: "POST",
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      );
      if (
        isApiZeroTrustEnforcementEnabled() &&
        (zt.decision === "BLOCK" || zt.decision === "REQUIRE_STEP_UP")
      ) {
        throw confirmationError(
          "ZERO_TRUST_DENIED",
          "Zero Trust blocked confirmation approval",
        );
      }
    }

    // Single-use: consume before execution to block races/replays
    const consumed: HumanConfirmationRecord = {
      ...record,
      status: "consumed",
      consumedAt: Date.now(),
    };
    await updateConfirmationRecord(
      consumed,
      Math.max(60_000, consumed.expiresAt - Date.now()),
    );

    let output: Readonly<Record<string, unknown>>;
    try {
      const controller = new AbortController();
      output = await runRealTool(
        record.toolId,
        toolContext,
        parsedArgs,
        controller.signal,
      );
    } catch (err) {
      await auditConfirmation("ai.confirmation.execution_failed", {
        userId: input.userId,
        confirmationId: record.confirmationId,
        metadata: {
          toolId: record.toolId,
          error:
            err instanceof Error
              ? err.message.slice(0, 200)
              : "execution_failed",
        },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      throw confirmationError(
        "EXECUTION_FAILED",
        err instanceof Error
          ? err.message.slice(0, 300)
          : "Tool execution failed after approval",
      );
    }

    reportMonitoring("CONFIRMATION_APPROVED", {
      userId: input.userId,
      resourceId: record.confirmationId,
      message: `Confirmation approved for ${record.action}`,
      metadata: {
        toolId: record.toolId,
        actionKey: record.actionKey,
        riskLevel: record.riskLevel,
        argumentsHash: record.argumentsHash,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    await auditConfirmation("ai.confirmation.approved", {
      userId: input.userId,
      confirmationId: record.confirmationId,
      metadata: {
        toolId: record.toolId,
        actionKey: record.actionKey,
        riskLevel: record.riskLevel,
        argumentsHash: record.argumentsHash,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    await auditConfirmation("ai.confirmation.executed", {
      userId: input.userId,
      confirmationId: record.confirmationId,
      metadata: {
        toolId: record.toolId,
        actionKey: record.actionKey,
        argumentsHash: record.argumentsHash,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return {
      ok: true,
      confirmationId: record.confirmationId,
      toolId: record.toolId,
      output,
    };
  }
}

export class ConfirmationEngineError extends Error {
  readonly reason: ConfirmationFailureReason;
  readonly statusCode: number;

  constructor(
    reason: ConfirmationFailureReason,
    message: string,
    statusCode: number,
  ) {
    super(message);
    this.name = "ConfirmationEngineError";
    this.reason = reason;
    this.statusCode = statusCode;
  }
}

function confirmationError(
  reason: ConfirmationFailureReason,
  message: string,
): ConfirmationEngineError {
  let statusCode = 400;
  switch (reason) {
    case "NOT_FOUND":
      statusCode = 404;
      break;
    case "USER_MISMATCH":
    case "SESSION_MISMATCH":
    case "TENANT_MISMATCH":
    case "RBAC_DENIED":
    case "POLICY_DENIED":
    case "PROMPT_SECURITY_DENIED":
    case "ZERO_TRUST_DENIED":
    case "SESSION_INVALID":
      statusCode = 403;
      break;
    case "EXPIRED":
    case "REPLAY":
    case "ARGUMENT_CHANGED":
    case "NOT_PENDING":
    case "DISABLED":
    case "EXECUTION_FAILED":
      statusCode = 400;
      break;
    default: {
      const _exhaustive: never = reason;
      void _exhaustive;
      statusCode = 400;
      break;
    }
  }
  return new ConfirmationEngineError(reason, message, statusCode);
}

export const humanConfirmationService = new HumanConfirmationService();
