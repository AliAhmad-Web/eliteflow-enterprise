/**
 * SIEM payload redaction — never export secrets, JWTs, API keys, or prompts.
 */

import {
  sanitizeAuditMetadata,
  sanitizeSensitiveData,
} from "@enterprise/shared";

const PROMPT_KEY_RE =
  /^(.*)?(prompt|systemprompt|userprompt|completion|messages|chatmessages|rawprompt|engineeredprompt)(.*)?$/i;

/** Extra SIEM-only keys that must never leave the tenant boundary. */
const SIEM_SECRET_KEY_RE =
  /^(.*)?(servicerolekey|supabaseservicerolekey|jwtsecret|jwks|encryptionkey|enterpriseencryptionkey|captcha|recaptchasecret|oauthclientsecret|stripe(secret|webhook)?key|n8n|anthropic|claude)(.*)?$/i;

const JWT_RE = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function stripPromptFields(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const normalized = key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (PROMPT_KEY_RE.test(key) || SIEM_SECRET_KEY_RE.test(normalized)) {
      out[key] = "[REDACTED]";
      continue;
    }
    if (typeof value === "string" && JWT_RE.test(value.trim())) {
      out[key] = "[REDACTED]";
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = stripPromptFields(value as Record<string, unknown>);
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = value.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? stripPromptFields(item as Record<string, unknown>)
          : typeof item === "string" && JWT_RE.test(item.trim())
            ? "[REDACTED]"
            : item,
      );
      continue;
    }
    out[key] = value;
  }
  return out;
}

/** Fully sanitize metadata for SIEM export. */
export function redactSiemMetadata(
  metadata?: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!metadata) return {};
  const audited = sanitizeAuditMetadata(metadata) ?? {};
  const stripped = stripPromptFields(audited);
  return sanitizeSensitiveData(stripped, "audit") as Record<string, unknown>;
}

/** Deep-clone event metadata and redact. */
export function redactSiemEventFields<T extends Record<string, unknown>>(
  event: T,
): T {
  return sanitizeSensitiveData(
    stripPromptFields(event as Record<string, unknown>),
    "audit",
  ) as T;
}
