/**
 * PromptSecurityService — centralized enterprise prompt injection protection.
 * All AI providers consume prompts after this layer; providers are unchanged.
 */

import { isApiSecurityMonitoringEnabled } from "../../../../config/security-flags.js";
import { securityMonitoringService } from "../../../../shared/security/monitoring/index.js";
import { writeAuditLogSafe } from "../../../../shared/security/write-audit-log.js";
import { AI_ERROR_CODES, AiError } from "../../ai.errors.js";
import {
  getPromptInjectionThreshold,
  isPromptDocumentScanEnabled,
  isPromptOutputValidationEnabled,
  isPromptSecurityEnabled,
} from "./prompt-security.config.js";
import {
  OUTPUT_LEAK_PATTERNS,
  PROMPT_INJECTION_PATTERNS,
  truncateEvidence,
} from "./prompt-security.patterns.js";
import type {
  PromptOutputScanResult,
  PromptScanResult,
  PromptSecurityAction,
  PromptSecurityContext,
  PromptThreatCategory,
  PromptThreatMatch,
} from "./prompt-security.types.js";

const REDACTION = "[REDACTED]";
const UNTRUSTED_OPEN = "[UNTRUSTED_DOCUMENT_DATA]";
const UNTRUSTED_CLOSE = "[/UNTRUSTED_DOCUMENT_DATA]";

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.floor(score)));
}

function resolveAction(score: number, threshold: number): PromptSecurityAction {
  if (score >= threshold) return "block";
  if (score >= Math.floor(threshold * 0.5)) return "sanitize";
  return "allow";
}

function stripInstructionLikeBlocks(text: string): string {
  return text
    .replace(
      /(?:^|\n)\s*(?:SYSTEM|DEVELOPER|SECURITY)\s*(?:PROMPT|OVERRIDE|INSTRUCTIONS?)\s*:[\s\S]{0,500}/gi,
      "\n",
    )
    .replace(/<\/?\s*system\s*>/gi, "")
    .replace(/\bignore\s+(?:all\s+)?(?:previous|prior)\s+instructions?\b/gi, "[filtered]")
    .trim();
}

class PromptSecurityService {
  isEnabled(): boolean {
    return isPromptSecurityEnabled();
  }

  /**
   * Scan user / document / memory / tool text for injection indicators.
   */
  scanText(
    text: string,
    options?: {
      threshold?: number;
      documentMode?: boolean;
    },
  ): PromptScanResult {
    if (!this.isEnabled()) {
      return {
        score: 0,
        action: "allow",
        matches: [],
        sanitizedText: text,
        blocked: false,
      };
    }

    const source = typeof text === "string" ? text : "";
    const threshold = options?.threshold ?? getPromptInjectionThreshold();
    const matches: PromptThreatMatch[] = [];
    let score = 0;

    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (options?.documentMode && pattern.category === "TOOL_INJECTION") {
        // Still scan document instruction blocks; skip shell-ish tool patterns.
        if (pattern.id === "tool_arg_injection") continue;
      }
      pattern.regex.lastIndex = 0;
      const hit = pattern.regex.exec(source);
      if (!hit) continue;
      score += pattern.weight;
      matches.push({
        category: pattern.category,
        patternId: pattern.id,
        evidence: truncateEvidence(hit[0] ?? pattern.id),
        weight: pattern.weight,
      });
    }

    score = clampScore(score);
    const action = resolveAction(score, threshold);
    const sanitizedText =
      action === "allow" ? source : stripInstructionLikeBlocks(source);

    return {
      score,
      action,
      matches: Object.freeze(matches),
      sanitizedText,
      blocked: action === "block",
    };
  }

  /** Scan + optionally throw AiError on block. */
  assertSafePrompt(
    text: string,
    context: PromptSecurityContext = {},
  ): PromptScanResult {
    const result = this.scanText(text);
    if (result.blocked) {
      this.reportThreat(result, context);
      throw new AiError(
        "Request blocked by AI prompt security policy.",
        403,
        AI_ERROR_CODES.PROMPT_SECURITY_DENIED,
      );
    }
    if (result.action === "sanitize" && result.matches.length > 0) {
      this.reportThreat(result, context, false);
    }
    return result;
  }

  /**
   * Document / retrieved context sanitization.
   * Marks suspicious sections; never injects raw instruction blocks.
   */
  sanitizeDocumentContent(
    content: string,
    context: PromptSecurityContext = {},
  ): { text: string; suspicious: boolean; scan: PromptScanResult } {
    if (!this.isEnabled() || !isPromptDocumentScanEnabled()) {
      return {
        text: content,
        suspicious: false,
        scan: {
          score: 0,
          action: "allow",
          matches: [],
          sanitizedText: content,
          blocked: false,
        },
      };
    }

    const scan = this.scanText(content, { documentMode: true });
    if (scan.matches.some((m) => m.category === "DOCUMENT_INJECTION") || scan.score >= 40) {
      this.reportThreat(scan, {
        ...context,
        surface: context.surface ?? "document",
      }, scan.blocked);
      // Wrap as untrusted data — never treat as instructions.
      const cleaned = stripInstructionLikeBlocks(content);
      return {
        text: `${UNTRUSTED_OPEN}\n${cleaned}\n${UNTRUSTED_CLOSE}`,
        suspicious: true,
        scan,
      };
    }

    return { text: content, suspicious: false, scan };
  }

  /** Reject malicious memory writes / poisoned summaries. */
  assertSafeMemoryWrite(
    summary: string,
    context: PromptSecurityContext = {},
  ): string {
    if (!this.isEnabled()) return summary;
    const scan = this.scanText(summary);
    const poisoning = scan.matches.some(
      (m) =>
        m.category === "MEMORY_POISONING" ||
        m.category === "PROMPT_INJECTION" ||
        m.category === "SYSTEM_PROMPT_ATTACK" ||
        m.category === "POLICY_BYPASS",
    );
    if (
      scan.blocked ||
      (poisoning && scan.score >= getPromptInjectionThreshold() * 0.7)
    ) {
      this.reportThreat(scan, { ...context, surface: "memory_write" }, true);
      throw new AiError(
        "Memory write blocked by AI prompt security policy.",
        403,
        AI_ERROR_CODES.PROMPT_SECURITY_DENIED,
      );
    }
    if (scan.action === "sanitize") {
      this.reportThreat(scan, { ...context, surface: "memory_write" }, false);
      return scan.sanitizedText;
    }
    return summary;
  }

  /** Soft-sanitize memory on read (defense in depth). */
  sanitizeMemoryText(summary: string): string {
    if (!this.isEnabled()) return summary;
    const scan = this.scanText(summary);
    if (scan.action === "allow") return summary;
    return scan.sanitizedText;
  }

  /**
   * Pre-tool execution validation.
   * Returns false when the tool must be blocked.
   */
  assertSafeToolCall(input: {
    toolId: string;
    args: unknown;
    prompt?: string | null;
    context?: PromptSecurityContext;
  }): void {
    if (!this.isEnabled()) return;

    const argText =
      typeof input.args === "string"
        ? input.args
        : JSON.stringify(input.args ?? {});
    const combined = `${input.prompt ?? ""}\n${argText}`;
    const scan = this.scanText(combined);
    const toolThreat = scan.matches.some(
      (m) =>
        m.category === "TOOL_INJECTION" ||
        m.category === "POLICY_BYPASS" ||
        m.category === "ROLE_OVERRIDE",
    );

    if (scan.blocked || (toolThreat && scan.score >= getPromptInjectionThreshold() * 0.75)) {
      this.reportThreat(
        scan,
        {
          ...(input.context ?? {}),
          toolId: input.toolId,
          surface: "tool",
        },
        true,
      );
      throw new AiError(
        `Tool '${input.toolId}' blocked by AI prompt security policy.`,
        403,
        AI_ERROR_CODES.PROMPT_SECURITY_DENIED,
      );
    }
  }

  /** Scan tool output for injection / secrets before re-injection into prompts. */
  sanitizeToolOutputText(text: string, context: PromptSecurityContext = {}): string {
    if (!this.isEnabled()) return text;
    const scan = this.scanText(text);
    let out = scan.action === "allow" ? text : scan.sanitizedText;
    if (isPromptOutputValidationEnabled()) {
      const leak = this.scanOutput(out);
      if (leak.leaked) {
        this.reportOutputLeak(leak, context);
        out = leak.redactedText;
      }
    }
    return out;
  }

  /** Model output validation — redact secrets / prompt leakage. */
  scanOutput(text: string): PromptOutputScanResult {
    if (!this.isEnabled() || !isPromptOutputValidationEnabled()) {
      return { leaked: false, redactedText: text, matches: [] };
    }

    let redacted = text;
    const matches: PromptThreatMatch[] = [];

    for (const pattern of OUTPUT_LEAK_PATTERNS) {
      pattern.regex.lastIndex = 0;
      if (!pattern.regex.test(redacted)) continue;
      pattern.regex.lastIndex = 0;
      redacted = redacted.replace(pattern.regex, REDACTION);
      matches.push({
        category: pattern.category,
        patternId: pattern.id,
        evidence: pattern.id,
        weight: pattern.weight,
      });
    }

    return {
      leaked: matches.length > 0,
      redactedText: redacted,
      matches: Object.freeze(matches),
    };
  }

  validateModelOutput(
    text: string,
    context: PromptSecurityContext = {},
  ): string {
    const result = this.scanOutput(text);
    if (result.leaked) {
      this.reportOutputLeak(result, context);
    }
    return result.redactedText;
  }

  /**
   * Sanitize untrusted context snippets before prompt assembly.
   * User prompt is never rewritten here.
   */
  sanitizeContextSnippets<T extends { text: string; title?: string }>(
    snippets: readonly T[],
  ): readonly T[] {
    if (!this.isEnabled() || !isPromptDocumentScanEnabled()) return snippets;
    return snippets.map((snippet) => {
      const { text } = this.sanitizeDocumentContent(snippet.text, {
        surface: "context_snippet",
      });
      return { ...snippet, text };
    });
  }

  private reportThreat(
    scan: PromptScanResult,
    context: PromptSecurityContext,
    confirmed = true,
  ): void {
    const primary = scan.matches[0];
    const category: PromptThreatCategory =
      primary?.category ?? "PROMPT_INJECTION";

    const metadata = {
      score: scan.score,
      action: scan.action,
      patternIds: scan.matches.map((m) => m.patternId),
      evidence: scan.matches.map((m) => m.evidence).slice(0, 5),
      surface: context.surface ?? null,
      toolId: context.toolId ?? null,
      conversationId: context.conversationId ?? null,
      // Never include raw prompt.
    };

    switch (category) {
      case "SYSTEM_PROMPT_ATTACK":
        void securityMonitoringService.reportSystemPromptAttack({
          userId: context.userId ?? null,
          resource: "ai_prompt",
          resourceId: context.conversationId ?? null,
          message: "System prompt attack detected",
          metadata,
        });
        break;
      case "SECRET_EXTRACTION":
        void securityMonitoringService.reportSecretExtractionAttempt({
          userId: context.userId ?? null,
          resource: "ai_prompt",
          resourceId: context.conversationId ?? null,
          message: "Secret extraction attempt detected",
          metadata,
        });
        break;
      case "MEMORY_POISONING":
        void securityMonitoringService.reportMemoryPoisoning({
          userId: context.userId ?? null,
          resource: "ai_memory",
          resourceId: context.conversationId ?? null,
          message: "Memory poisoning attempt detected",
          metadata,
        });
        break;
      case "DOCUMENT_INJECTION":
        void securityMonitoringService.reportDocumentInjection({
          userId: context.userId ?? null,
          resource: "ai_document",
          resourceId: context.conversationId ?? null,
          message: "Document injection detected",
          metadata,
        });
        break;
      case "TOOL_INJECTION":
        void securityMonitoringService.reportToolInjection({
          userId: context.userId ?? null,
          resource: "ai_tool",
          resourceId: context.toolId ?? null,
          message: "Tool injection detected",
          metadata,
        });
        break;
      case "OUTPUT_SECRET_LEAK":
        void securityMonitoringService.reportOutputSecretLeak({
          userId: context.userId ?? null,
          resource: "ai_output",
          resourceId: context.conversationId ?? null,
          message: "Output secret leak detected",
          metadata,
        });
        break;
      case "PROMPT_INJECTION":
      case "ROLE_OVERRIDE":
      case "POLICY_BYPASS":
        void securityMonitoringService.reportPromptInjectionAttempt({
          userId: context.userId ?? null,
          resource: "ai_prompt",
          resourceId: context.conversationId ?? null,
          message: "Prompt injection attempt detected",
          metadata,
        });
        break;
      default: {
        const _exhaustive: never = category;
        void _exhaustive;
        void securityMonitoringService.reportPromptInjectionAttempt({
          userId: context.userId ?? null,
          resource: "ai_prompt",
          resourceId: context.conversationId ?? null,
          message: "Prompt security threat detected",
          metadata,
        });
        break;
      }
    }

    // Audit only confirmed attacks — sanitized evidence only.
    if (confirmed && isApiSecurityMonitoringEnabled()) {
      void writeAuditLogSafe(
        {
          userId: context.userId ?? null,
          action: "ai.prompt_security_blocked",
          resource: "ai",
          resourceId: context.conversationId ?? context.toolId ?? null,
          metadata,
        },
        "prompt-security",
      );
    }
  }

  private reportOutputLeak(
    result: PromptOutputScanResult,
    context: PromptSecurityContext,
  ): void {
    void securityMonitoringService.reportOutputSecretLeak({
      userId: context.userId ?? null,
      resource: "ai_output",
      resourceId: context.conversationId ?? null,
      message: "AI output secret / prompt leakage redacted",
      metadata: {
        patternIds: result.matches.map((m) => m.patternId),
        surface: context.surface ?? "output",
      },
    });

    if (isApiSecurityMonitoringEnabled()) {
      void writeAuditLogSafe(
        {
          userId: context.userId ?? null,
          action: "ai.prompt_security_output_redacted",
          resource: "ai",
          resourceId: context.conversationId ?? null,
          metadata: {
            patternIds: result.matches.map((m) => m.patternId),
          },
        },
        "prompt-security",
      );
    }
  }
}

export const promptSecurityService = new PromptSecurityService();
