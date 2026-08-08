import { writeAuditLogSafe } from "../../../../shared/security/write-audit-log.js";
import { securityMonitoringService } from "../../../../shared/security/monitoring/index.js";
import type { AiContextSnippet } from "../contracts/ai-active-context.js";
import type { AiMemoryEntry } from "../memory/memory-entry.js";
import { freezeMemoryEntry } from "../memory/memory-entry.js";
import {
  AI_DATA_POLICY_AUDIT,
  AI_REDACTED,
  AI_RESTRICTED_TEXT_RE,
  canAiReceiveRestrictedData,
  isAiRestrictedKey,
  type AiDataPolicyResource,
  type AiDataPolicySubject,
} from "./ai-data-policy.types.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

async function auditPolicyEvent(input: {
  subject: AiDataPolicySubject;
  action: (typeof AI_DATA_POLICY_AUDIT)[keyof typeof AI_DATA_POLICY_AUDIT];
  resource: AiDataPolicyResource;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await writeAuditLogSafe(
    {
      userId: input.subject.userId ?? null,
      action: input.action,
      resource: "ai",
      resourceId: input.resourceId ?? null,
      metadata: {
        policyResource: input.resource,
        role: input.subject.role ?? null,
        // Never log secret values — keys/flags only.
        blocked: true,
        ...(input.metadata ?? {}),
      },
      ipAddress: input.subject.ipAddress ?? null,
      userAgent: input.subject.userAgent ?? null,
    },
    "ai-data-policy",
  );

  void securityMonitoringService.reportAiPolicyDenial({
    userId: input.subject.userId ?? null,
    resource: "ai",
    resourceId: input.resourceId ?? null,
    message: "AI data policy denial",
    metadata: {
      policyAction: input.action,
      policyResource: input.resource,
    },
    ipAddress: input.subject.ipAddress ?? null,
    userAgent: input.subject.userAgent ?? null,
  });
}

/**
 * Centralized AI RESTRICTED Data Guard.
 * Every AI surface must use these helpers — do not duplicate filtering.
 */
export class AiDataPolicyService {
  /**
   * Gate privileged AI data access. Throws nothing for normal chat;
   * returns whether restricted fields may flow. Logs AI_POLICY_DENIED when denied.
   */
  async assertAIAccess(
    subject: AiDataPolicySubject,
    resource: AiDataPolicyResource = "ai_surface",
    options?: { requireRestricted?: boolean; resourceId?: string | null },
  ): Promise<{ allowed: boolean; restrictedAllowed: boolean }> {
    const restrictedAllowed = canAiReceiveRestrictedData(subject);

    if (options?.requireRestricted && !restrictedAllowed) {
      await auditPolicyEvent({
        subject,
        action: AI_DATA_POLICY_AUDIT.POLICY_DENIED,
        resource,
        resourceId: options.resourceId,
        metadata: { requireRestricted: true },
      });
      return { allowed: true, restrictedAllowed: false };
    }

    // Clients never receive internal enterprise HR/security payloads.
    if (
      (subject.role === "CLIENT" || subject.role === "Client") &&
      (resource === "restricted_hr" || resource === "memory")
    ) {
      await auditPolicyEvent({
        subject,
        action: AI_DATA_POLICY_AUDIT.POLICY_DENIED,
        resource,
        resourceId: options?.resourceId,
        metadata: { reason: "client_internal_blocked" },
      });
      return { allowed: true, restrictedAllowed: false };
    }

    return { allowed: true, restrictedAllowed };
  }

  /**
   * Deep-filter object graphs: RESTRICTED keys → [REDACTED] unless authorized.
   */
  filterRestrictedFields<T>(
    value: T,
    subject: AiDataPolicySubject,
    options?: { depth?: number; auditOnBlock?: boolean },
  ): T {
    const allow = canAiReceiveRestrictedData(subject);
    let blocked = false;

    const walk = (input: unknown, depth: number): unknown => {
      if (depth > 8) return input;
      if (input === null || input === undefined) return input;

      if (typeof input === "string") {
        return this.sanitizeRestrictedText(input, subject);
      }

      if (Array.isArray(input)) {
        return input.map((item) => walk(item, depth + 1));
      }

      if (!isPlainObject(input)) {
        return input;
      }

      const out: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(input)) {
        if (!allow && isAiRestrictedKey(key)) {
          out[key] = AI_REDACTED;
          blocked = true;
          continue;
        }
        out[key] = walk(child, depth + 1);
      }
      return out;
    };

    const result = walk(value, options?.depth ?? 0) as T;

    if (blocked && options?.auditOnBlock !== false) {
      void auditPolicyEvent({
        subject,
        action: AI_DATA_POLICY_AUDIT.RESTRICTED_DATA_BLOCKED,
        resource: "tool",
        metadata: { filter: "filterRestrictedFields" },
      });
    }

    return result;
  }

  /** Scrub free-text that embeds restricted keywords / credential patterns. */
  sanitizeRestrictedText(
    text: string,
    subject: AiDataPolicySubject,
  ): string {
    if (canAiReceiveRestrictedData(subject)) {
      return text;
    }
    if (!text) return text;

    let next = text;

    // Key=value / JSON-style leaks first (whole assignment).
    next = next.replace(
      /("?(?:salary|compensation|oldSalary|newSalary|nationalId|national_id|passport|taxNumber|tax_id|taxId|qrToken|qr_token|qrPayload|accessToken|refreshToken|temporaryPassword|passwordSetupUrl|setupUrl|passwordHash|mfaSecret|twoFactorSecret|apiKey|clientSecret|encryptionKey|recoveryCodes?|iban|bankAccount)"?\s*[:=]\s*)("(?:\\.|[^"\\])*"|'[^']*'|[^\s,;}\]]+)/gi,
      `$1"${AI_REDACTED}"`,
    );

    // Prose: "salary is 90000", "national id 1234", camelCase identifiers.
    next = next.replace(
      /\b(salary|compensation)\b(?:\s*(?:is|=|:)?\s*\$?[\d,]+(?:\.\d+)?)?/gi,
      AI_REDACTED,
    );
    next = next.replace(
      /\b(national\s*id|nationalId|passport|tax\s*(?:id|number|identifier)|taxNumber|taxId|qr\s*token|qrToken|qrPayload|oauth|access\s*token|accessToken|refresh\s*token|refreshToken|password\s*hash|passwordHash|temporary\s*password|temporaryPassword|password\s*setup\s*url|passwordSetupUrl|setup\s*url|setupUrl|recovery\s*codes?|mfa\s*secret|mfaSecret|encryption\s*key|encryptionKey|api\s*key|apiKey|client\s*secret|clientSecret|private\s*key|iban|bank\s*account)\b(?:\s*[:=]?\s*[A-Za-z0-9._\-]+)?/gi,
      AI_REDACTED,
    );

    next = next.replace(AI_RESTRICTED_TEXT_RE, AI_REDACTED);

    return next;
  }

  sanitizeAIContext(
    snippets: readonly AiContextSnippet[],
    subject: AiDataPolicySubject,
  ): readonly AiContextSnippet[] {
    if (snippets.length === 0) return snippets;
    return Object.freeze(
      snippets.map((snippet) =>
        Object.freeze({
          ...snippet,
          text: this.sanitizeRestrictedText(snippet.text, subject),
          title: snippet.title
            ? this.sanitizeRestrictedText(snippet.title, subject)
            : snippet.title,
        }),
      ),
    );
  }

  sanitizeAIMemory(
    entries: readonly AiMemoryEntry[],
    subject: AiDataPolicySubject,
  ): readonly AiMemoryEntry[] {
    if (entries.length === 0) return entries;
    return Object.freeze(
      entries.map((entry) =>
        freezeMemoryEntry({
          ...entry,
          summary: this.sanitizeRestrictedText(entry.summary, subject),
          tags: entry.tags.map((tag) =>
            isAiRestrictedKey(tag)
              ? AI_REDACTED
              : this.sanitizeRestrictedText(tag, subject),
          ),
        }),
      ),
    );
  }

  sanitizeDocuments(
    content: string,
    subject: AiDataPolicySubject,
  ): string {
    return this.sanitizeRestrictedText(content, subject);
  }

  sanitizeSearchResults(
    entries: readonly AiMemoryEntry[],
    subject: AiDataPolicySubject,
  ): readonly AiMemoryEntry[] {
    return this.sanitizeAIMemory(entries, subject);
  }

  sanitizeToolOutput<T extends Record<string, unknown>>(
    output: T,
    subject: AiDataPolicySubject,
  ): T {
    return this.filterRestrictedFields(output, subject, {
      auditOnBlock: true,
    });
  }

  sanitizeAnalytics<T>(
    value: T,
    subject: AiDataPolicySubject,
  ): T {
    return this.filterRestrictedFields(value, subject, {
      auditOnBlock: false,
    });
  }

  sanitizeSummary(
    text: string,
    subject: AiDataPolicySubject,
  ): string {
    return this.sanitizeRestrictedText(text, subject);
  }

  /** Build subject from pipeline / service actor fields. */
  subjectFrom(input: {
    userId?: string | null;
    role?: string | null;
    permissions?: readonly string[] | null;
    explicitRestrictedAccess?: boolean;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): AiDataPolicySubject {
    return {
      userId: input.userId ?? null,
      role: input.role ?? null,
      permissions: input.permissions ?? null,
      explicitRestrictedAccess: input.explicitRestrictedAccess === true,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    };
  }
}

export const aiDataPolicyService = new AiDataPolicyService();
