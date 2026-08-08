/**
 * Detection pattern catalog for prompt injection / exfiltration.
 * Evidence is always truncated/sanitized — never store full attack payloads.
 */

import type { PromptThreatCategory } from "./prompt-security.types.js";

export interface PromptSecurityPattern {
  readonly id: string;
  readonly category: PromptThreatCategory;
  readonly weight: number;
  readonly regex: RegExp;
}

export const PROMPT_INJECTION_PATTERNS: readonly PromptSecurityPattern[] = [
  {
    id: "ignore_previous",
    category: "PROMPT_INJECTION",
    weight: 40,
    regex:
      /\b(ignore|disregard|forget|override)\b[\s\S]{0,40}\b(previous|prior|above|all)\b[\s\S]{0,40}\b(instructions?|prompts?|rules?|guidelines?)\b/i,
  },
  {
    id: "ignore_security",
    category: "PROMPT_INJECTION",
    weight: 45,
    regex:
      /\b(ignore|disable|bypass|turn\s*off)\b[\s\S]{0,30}\b(security|filters?|safeguards?|guardrails?|safety)\b/i,
  },
  {
    id: "developer_mode",
    category: "SYSTEM_PROMPT_ATTACK",
    weight: 35,
    regex:
      /\b(developer\s*mode|dev\s*mode|dan\s*mode|god\s*mode|jailbreak)\b/i,
  },
  {
    id: "reveal_system_prompt",
    category: "SYSTEM_PROMPT_ATTACK",
    weight: 50,
    regex:
      /\b(reveal|show|print|display|output|dump|repeat)\b[\s\S]{0,40}\b(system\s*prompt|hidden\s*prompt|developer\s*prompt|security\s*prompt|initial\s*instructions?)\b/i,
  },
  {
    id: "print_memory",
    category: "SECRET_EXTRACTION",
    weight: 40,
    regex:
      /\b(print|show|dump|reveal|list)\b[\s\S]{0,30}\b(memory|memories|conversation\s*history|hidden\s*context)\b/i,
  },
  {
    id: "reveal_secrets",
    category: "SECRET_EXTRACTION",
    weight: 55,
    regex:
      /\b(reveal|show|print|exfiltrate|leak|give\s*me)\b[\s\S]{0,40}\b(api\s*keys?|tokens?|secrets?|credentials?|passwords?|env(ironment)?\s*vars?|connection\s*strings?)\b/i,
  },
  {
    id: "role_override_admin",
    category: "ROLE_OVERRIDE",
    weight: 45,
    regex:
      /\b(act\s*as|pretend\s*(to\s*be)?|you\s*are\s*now|roleplay\s*as)\b[\s\S]{0,40}\b(super\s*admin|administrator|root|system|developer)\b/i,
  },
  {
    id: "ignore_rbac",
    category: "POLICY_BYPASS",
    weight: 50,
    regex:
      /\b(ignore|bypass|disable|override)\b[\s\S]{0,40}\b(rbac|permissions?|acl|authorization|access\s*control)\b/i,
  },
  {
    id: "ignore_zero_trust",
    category: "POLICY_BYPASS",
    weight: 50,
    regex:
      /\b(ignore|bypass|disable|override)\b[\s\S]{0,40}\b(zero\s*trust|ztna|step[\s-]*up)\b/i,
  },
  {
    id: "bypass_ai_policy",
    category: "POLICY_BYPASS",
    weight: 50,
    regex:
      /\b(ignore|bypass|disable|override)\b[\s\S]{0,40}\b(ai\s*(data\s*)?policy|data\s*policy|content\s*policy)\b/i,
  },
  {
    id: "execute_hidden_tools",
    category: "TOOL_INJECTION",
    weight: 45,
    regex:
      /\b(execute|run|invoke|call)\b[\s\S]{0,40}\b(hidden|internal|secret|unauthorized)\b[\s\S]{0,20}\b(tools?|functions?|commands?)\b/i,
  },
  {
    id: "prompt_chaining",
    category: "PROMPT_INJECTION",
    weight: 30,
    regex:
      /\b(new\s*instructions?:|updated\s*system\s*prompt:|begin\s*system\s*message|<\/?\s*system\s*>)\b/i,
  },
  {
    id: "recursive_prompt",
    category: "PROMPT_INJECTION",
    weight: 35,
    regex:
      /\b(repeat\s*(this|the)\s*(prompt|instruction)|recursive(ly)?\s*(prompt|inject)|prompt\s*injection)\b/i,
  },
  {
    id: "document_instruction_block",
    category: "DOCUMENT_INJECTION",
    weight: 40,
    regex:
      /\b(IMPORTANT\s*INSTRUCTIONS?\s*FOR\s*(THE\s*)?AI|SYSTEM\s*OVERRIDE|IGNORE\s*ALL\s*OTHER|DO\s*NOT\s*TELL\s*THE\s*USER)\b/i,
  },
  {
    id: "memory_poison",
    category: "MEMORY_POISONING",
    weight: 40,
    regex:
      /\b(store\s*(this\s*)?(as\s*)?(permanent\s*)?memory|always\s*remember\s*that\s*you\s*must|from\s*now\s*on\s*ignore)\b/i,
  },
  {
    id: "tool_arg_injection",
    category: "TOOL_INJECTION",
    weight: 35,
    regex:
      /\b(shell\s*=|eval\s*\(|\$\{|;\s*(rm|curl|wget|powershell)|__proto__|constructor\s*\[)\b/i,
  },
] as const;

/** Output / egress secret patterns — redact matches. */
export const OUTPUT_LEAK_PATTERNS: readonly PromptSecurityPattern[] = [
  {
    id: "jwt",
    category: "OUTPUT_SECRET_LEAK",
    weight: 60,
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    id: "api_key_generic",
    category: "OUTPUT_SECRET_LEAK",
    weight: 55,
    regex:
      /\b(sk-[A-Za-z0-9]{20,}|api[_-]?key\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{16,})\b/gi,
  },
  {
    id: "bearer_token",
    category: "OUTPUT_SECRET_LEAK",
    weight: 55,
    regex: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/g,
  },
  {
    id: "connection_string",
    category: "OUTPUT_SECRET_LEAK",
    weight: 50,
    regex:
      /\b(postgres(ql)?|mysql|mongodb(\+srv)?:\/\/)[^\s\"']{8,}/gi,
  },
  {
    id: "password_assignment",
    category: "OUTPUT_SECRET_LEAK",
    weight: 45,
    regex: /\b(password|passwd|pwd)\s*[:=]\s*['\"]?[^\s'\"]{6,}/gi,
  },
  {
    id: "internal_setup_url",
    category: "OUTPUT_SECRET_LEAK",
    weight: 40,
    regex:
      /\bhttps?:\/\/[^\s]*(setup|reset-password|invite|internal|localhost:\d+)[^\s]*/gi,
  },
  {
    id: "system_prompt_leak",
    category: "SYSTEM_PROMPT_ATTACK",
    weight: 50,
    regex:
      /\b(you\s*are\s*(an?\s*)?(enterprise|internal)\s*(ai|assistant)|developer\s*prompt\s*:|security\s*prompt\s*:)\b/i,
  },
] as const;

export function truncateEvidence(text: string, max = 80): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max)}…`;
}
