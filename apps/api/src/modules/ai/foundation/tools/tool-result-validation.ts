/**
 * Enterprise Tool Result Validation & Security Layer.
 * Validates, sanitizes, and normalizes tool outputs before prompt injection.
 * Never stops the pipeline — invalid results are rejected and excluded.
 */

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiEffectivePolicy } from "../contracts/ai-effective-policy.js";
import type {
  AiToolExecution,
  AiToolExecutionStatus,
  AiToolId,
} from "../contracts/ai-tool-execution.js";
import {
  AI_TOOL_CATALOG,
  type AiToolDefinition,
} from "./tool-catalog.js";

/** Default max serialized output size (chars). Env: AI_TOOL_RESULT_MAX_OUTPUT_CHARS */
export const DEFAULT_TOOL_RESULT_MAX_OUTPUT_CHARS = 2000;

const SENSITIVE_KEY_RE =
  /^(password|passwd|secret|token|api[_-]?key|authorization|access[_-]?token|refresh[_-]?token|ssn|credit[_-]?card|card[_-]?number|private[_-]?key|cookie|session|auth)$/i;

const EMAIL_RE =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE =
  /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g;
const CARD_RE = /\b(?:\d[ -]*?){13,19}\b/g;

export type AiValidatedToolResultStatus = "succeeded" | "failed";

export interface AiValidatedToolResult {
  readonly toolId: AiToolId;
  readonly status: AiValidatedToolResultStatus;
  readonly valid: boolean;
  readonly rejectionReason?: string;
  /** Sanitized, size-limited output (succeeded only when valid). */
  readonly sanitizedOutput?: Readonly<Record<string, unknown>>;
  /** Sanitized error (failed only when valid). */
  readonly sanitizedError?: string;
  readonly executionTimeMs?: number;
  readonly confidence?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface AiValidatedToolResults {
  readonly results: readonly AiValidatedToolResult[];
  readonly accepted: readonly AiValidatedToolResult[];
  readonly rejected: readonly AiValidatedToolResult[];
}

export interface ValidateToolResultsInput {
  readonly executions: readonly AiToolExecution[];
  readonly policy: AiEffectivePolicy;
  readonly activeContext: AiActiveContext;
  readonly permissions?: readonly string[] | null;
  readonly catalog?: readonly AiToolDefinition[];
  /** Optional confidence by toolId (e.g. from intelligent selection). */
  readonly confidenceByToolId?: ReadonlyMap<AiToolId, number> | null;
  readonly maxOutputChars?: number;
}

export function resolveToolResultMaxOutputChars(): number {
  const raw = process.env.AI_TOOL_RESULT_MAX_OUTPUT_CHARS?.trim();
  if (!raw) return DEFAULT_TOOL_RESULT_MAX_OUTPUT_CHARS;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 64) {
    return DEFAULT_TOOL_RESULT_MAX_OUTPUT_CHARS;
  }
  return Math.min(value, 32_000);
}

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isCompletedStatus(
  status: AiToolExecutionStatus,
): status is AiValidatedToolResultStatus {
  return status === "succeeded" || status === "failed";
}

function definitionById(
  catalog: readonly AiToolDefinition[],
  toolId: AiToolId,
): AiToolDefinition | null {
  return catalog.find((item) => item.id === toolId) ?? null;
}

function sanitizeString(
  value: string,
  privacyMode: boolean,
  maxChars: number,
): string {
  let next = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  next = next.replace(/[\r\n\t]+/g, " ").trim();

  if (privacyMode) {
    next = next
      .replace(EMAIL_RE, "[redacted-email]")
      .replace(CARD_RE, "[redacted-card]")
      .replace(PHONE_RE, "[redacted-phone]");
  }

  if (next.length > maxChars) {
    return `${next.slice(0, Math.max(0, maxChars - 14))}…[truncated]`;
  }
  return next;
}

function redactValue(
  key: string,
  value: unknown,
  privacyMode: boolean,
  maxChars: number,
  depth: number,
): unknown {
  if (SENSITIVE_KEY_RE.test(key) || (privacyMode && SENSITIVE_KEY_RE.test(key))) {
    return "[redacted]";
  }

  if (typeof value === "string") {
    return sanitizeString(value, privacyMode, maxChars);
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    if (depth >= 4) return "[truncated-array]";
    return value.slice(0, 50).map((item, index) =>
      redactValue(String(index), item, privacyMode, maxChars, depth + 1),
    );
  }

  if (isPlainObject(value)) {
    if (depth >= 4) return "[truncated-object]";
    return sanitizeRecord(value, privacyMode, maxChars, depth + 1);
  }

  return "[unsupported]";
}

function sanitizeRecord(
  input: Readonly<Record<string, unknown>>,
  privacyMode: boolean,
  maxChars: number,
  depth = 0,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keys = Object.keys(input).sort();
  for (const key of keys) {
    if (SENSITIVE_KEY_RE.test(key)) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = redactValue(key, input[key], privacyMode, maxChars, depth);
  }
  return out;
}

function enforceOutputSize(
  output: Record<string, unknown>,
  maxChars: number,
): { output: Record<string, unknown>; truncated: boolean } {
  try {
    const serialized = JSON.stringify(output);
    if (serialized.length <= maxChars) {
      return { output, truncated: false };
    }

    // Deterministic truncation: keep keys in sorted order until budget exhausted.
    const trimmed: Record<string, unknown> = {};
    let used = 2; // {}
    const keys = Object.keys(output).sort();
    for (const key of keys) {
      const slice = { [key]: output[key] };
      const piece = JSON.stringify(slice);
      const extra = piece.length - 2; // remove surrounding {}
      const separator = Object.keys(trimmed).length > 0 ? 1 : 0;
      if (used + separator + extra > maxChars - 20) {
        trimmed._truncated = true;
        break;
      }
      trimmed[key] = output[key];
      used += separator + extra;
    }
    if (!("_truncated" in trimmed)) {
      trimmed._truncated = true;
    }
    return { output: trimmed, truncated: true };
  } catch {
    return { output: { _error: "unserializable_output" }, truncated: true };
  }
}

function resolveConfidence(
  execution: AiToolExecution,
  confidenceByToolId?: ReadonlyMap<AiToolId, number> | null,
): number | undefined {
  const fromMap = confidenceByToolId?.get(execution.toolId);
  if (typeof fromMap === "number" && Number.isFinite(fromMap)) {
    return Math.min(1, Math.max(0, fromMap));
  }

  const meta = execution.metadata?.confidence;
  if (typeof meta === "number" && Number.isFinite(meta)) {
    return Math.min(1, Math.max(0, meta));
  }

  return undefined;
}

function checkRbac(
  toolId: AiToolId,
  catalog: readonly AiToolDefinition[],
  permissions: readonly string[] | null | undefined,
): string | null {
  if (!permissions || permissions.length === 0) {
    return null; // eligibility already enforced; no extra denial without permission set
  }
  const definition = definitionById(catalog, toolId);
  if (!definition) return null;
  if (definition.requiredPermissions.length === 0) return null;
  const set = new Set(permissions);
  const missing = definition.requiredPermissions.filter((p) => !set.has(p));
  if (missing.length > 0) {
    return `rbac:missing_permissions:${missing.join(",")}`;
  }
  return null;
}

function checkOrganizationBoundary(
  output: Readonly<Record<string, unknown>> | undefined,
  activeContext: AiActiveContext,
): string | null {
  if (!output) return null;
  const contextOrg =
    activeContext.organization?.organizationId ??
    activeContext.organization?.organizationKey ??
    null;
  if (!contextOrg) return null;

  const outputOrg = output.organizationId ?? output.organizationKey;
  if (typeof outputOrg !== "string" || !outputOrg.trim()) return null;
  if (outputOrg.trim() !== contextOrg) {
    return "organization_boundary:mismatch";
  }
  return null;
}

function reject(
  execution: AiToolExecution,
  reason: string,
  confidence?: number,
): AiValidatedToolResult {
  return Object.freeze({
    toolId: execution.toolId,
    status: (execution.status === "failed" ? "failed" : "succeeded") as AiValidatedToolResultStatus,
    valid: false,
    rejectionReason: reason,
    executionTimeMs: execution.executionTimeMs,
    confidence,
    metadata: execution.metadata
      ? Object.freeze({ ...execution.metadata })
      : undefined,
  });
}

function acceptSucceeded(
  execution: AiToolExecution,
  sanitizedOutput: Readonly<Record<string, unknown>>,
  confidence: number | undefined,
  extraMeta?: Record<string, unknown>,
): AiValidatedToolResult {
  return Object.freeze({
    toolId: execution.toolId,
    status: "succeeded" as const,
    valid: true,
    sanitizedOutput: Object.freeze({ ...sanitizedOutput }),
    executionTimeMs: execution.executionTimeMs,
    confidence,
    metadata: Object.freeze({
      ...(execution.metadata ?? {}),
      ...(extraMeta ?? {}),
      validated: true,
    }),
  });
}

function acceptFailed(
  execution: AiToolExecution,
  sanitizedError: string,
  confidence: number | undefined,
): AiValidatedToolResult {
  return Object.freeze({
    toolId: execution.toolId,
    status: "failed" as const,
    valid: true,
    sanitizedError,
    executionTimeMs: execution.executionTimeMs,
    confidence,
    metadata: Object.freeze({
      ...(execution.metadata ?? {}),
      validated: true,
    }),
  });
}

/**
 * Validate and sanitize completed tool results into a normalized contract.
 * Non-completed executions are ignored. Invalid results are rejected, not thrown.
 */
export function validateToolResults(
  input: ValidateToolResultsInput,
): AiValidatedToolResults {
  const catalog = input.catalog ?? AI_TOOL_CATALOG;
  const maxChars =
    input.maxOutputChars ?? resolveToolResultMaxOutputChars();
  const privacyMode = input.policy.privacyMode === true;
  const results: AiValidatedToolResult[] = [];

  for (const execution of input.executions) {
    if (!isCompletedStatus(execution.status)) {
      continue;
    }

    const confidence = resolveConfidence(
      execution,
      input.confidenceByToolId,
    );

    if (typeof execution.toolId !== "string" || !execution.toolId.trim()) {
      results.push(
        reject(
          { ...execution, toolId: execution.toolId || "unknown" },
          "malformed:missing_tool_id",
          confidence,
        ),
      );
      continue;
    }

    const rbac = checkRbac(
      execution.toolId,
      catalog,
      input.permissions,
    );
    if (rbac) {
      results.push(reject(execution, rbac, confidence));
      continue;
    }

    if (execution.status === "succeeded") {
      if (execution.output !== undefined && !isPlainObject(execution.output)) {
        results.push(reject(execution, "malformed:output_not_object", confidence));
        continue;
      }

      const orgIssue = checkOrganizationBoundary(
        execution.output,
        input.activeContext,
      );
      if (orgIssue) {
        results.push(reject(execution, orgIssue, confidence));
        continue;
      }

      // Privacy mode: strip sensitive fields even when still validating for state.
      const base = execution.output ?? {};
      let sanitized = sanitizeRecord(base, privacyMode, maxChars);
      if (privacyMode) {
        // Drop high-risk payload keys entirely under privacy mode.
        const filtered: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(sanitized)) {
          if (SENSITIVE_KEY_RE.test(key)) {
            filtered[key] = "[redacted]";
          } else if (key.toLowerCase().includes("email") || key.toLowerCase().includes("phone")) {
            filtered[key] = "[redacted]";
          } else {
            filtered[key] = value;
          }
        }
        sanitized = filtered;
      }

      let serializable = true;
      try {
        JSON.stringify(sanitized);
      } catch {
        serializable = false;
      }
      if (!serializable) {
        results.push(reject(execution, "malformed:unserializable_output", confidence));
        continue;
      }

      const sized = enforceOutputSize(sanitized, maxChars);
      results.push(
        acceptSucceeded(execution, sized.output, confidence, {
          truncated: sized.truncated,
          privacyFiltered: privacyMode,
        }),
      );
      continue;
    }

    // failed
    const rawError =
      execution.errorMessage?.trim() ||
      execution.error?.trim() ||
      "";
    if (!rawError) {
      results.push(reject(execution, "malformed:missing_error", confidence));
      continue;
    }

    const sanitizedError = sanitizeString(rawError, privacyMode, Math.min(500, maxChars));
    results.push(acceptFailed(execution, sanitizedError, confidence));
  }

  const accepted = results.filter((item) => item.valid);
  const rejected = results.filter((item) => !item.valid);

  return Object.freeze({
    results: Object.freeze(results),
    accepted: Object.freeze(accepted),
    rejected: Object.freeze(rejected),
  });
}

/**
 * Map accepted validated results into AiToolExecution shapes for runtime formatting.
 */
export function validatedResultsToExecutions(
  validated: AiValidatedToolResults,
): readonly AiToolExecution[] {
  return Object.freeze(
    validated.accepted.map((item) => {
      if (item.status === "succeeded") {
        return Object.freeze({
          toolId: item.toolId,
          status: "succeeded" as const,
          output: item.sanitizedOutput,
          executionTimeMs: item.executionTimeMs,
          metadata: {
            ...(item.metadata ?? {}),
            ...(item.confidence !== undefined
              ? { confidence: item.confidence }
              : {}),
          },
        });
      }

      return Object.freeze({
        toolId: item.toolId,
        status: "failed" as const,
        error: item.sanitizedError,
        errorMessage: item.sanitizedError,
        executionTimeMs: item.executionTimeMs,
        metadata: {
          ...(item.metadata ?? {}),
          ...(item.confidence !== undefined
            ? { confidence: item.confidence }
            : {}),
        },
      });
    }),
  );
}
