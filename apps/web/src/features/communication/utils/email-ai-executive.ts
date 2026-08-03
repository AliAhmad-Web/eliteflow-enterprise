/**
 * Executive Assistant helpers — rewrite styles, insights, validation extras, commands.
 * Pure client helpers; delivery still uses emailService + notification queue.
 */

import type { NotificationQueueDto } from "@enterprise/shared";

import type { EmailDraftStyle, RecipientCandidate } from "../utils/email-ai-agent";
import {
  composeAiEmailDraft,
  detectDraftStyle,
} from "../utils/email-ai-agent";
import type { EmailComposeDraft, EmailMessage } from "../utils/email-workspace";

export const EMAIL_AI_REWRITE_STYLES = [
  "formal",
  "friendly",
  "executive",
  "apology",
  "reminder",
  "follow_up",
  "sales",
  "hr",
  "legal",
  "support",
  "marketing",
  "announcement",
  "professional",
] as const;

export type EmailAiRewriteStyle = (typeof EMAIL_AI_REWRITE_STYLES)[number];

export const EMAIL_AI_REWRITE_LABELS: Record<EmailAiRewriteStyle, string> = {
  formal: "Formal",
  friendly: "Friendly",
  executive: "Executive",
  apology: "Apology",
  reminder: "Reminder",
  follow_up: "Follow-up",
  sales: "Sales",
  hr: "HR",
  legal: "Legal",
  support: "Support",
  marketing: "Marketing",
  announcement: "Announcement",
  professional: "Professional",
};

function rewriteStyleToDraftStyle(style: EmailAiRewriteStyle): EmailDraftStyle {
  switch (style) {
    case "formal":
      return "formal";
    case "friendly":
      return "friendly";
    case "executive":
      return "executive";
    case "apology":
      return "formal";
    case "reminder":
      return "reminder";
    case "follow_up":
      return "reminder";
    case "sales":
      return "sales";
    case "hr":
      return "hr";
    case "legal":
      return "formal";
    case "support":
      return "support";
    case "marketing":
      return "sales";
    case "announcement":
      return "status_update";
    case "professional":
      return "professional";
    default: {
      const _exhaustive: never = style;
      return _exhaustive;
    }
  }
}

export function applyEmailAiRewrite(
  style: EmailAiRewriteStyle,
  source: { subject: string; body: string },
  authorName?: string,
): { subject: string; body: string; note: string } {
  const draftStyle = rewriteStyleToDraftStyle(style);
  let prompt = source.body || source.subject;
  switch (style) {
    case "apology":
      prompt = `Write a sincere professional apology regarding:\n${prompt}`;
      break;
    case "follow_up":
      prompt = `Write a polite follow-up regarding:\n${prompt}`;
      break;
    case "legal":
      prompt = `Rewrite in clear, careful legal-business tone:\n${prompt}`;
      break;
    case "marketing":
      prompt = `Rewrite as a concise marketing announcement:\n${prompt}`;
      break;
    case "announcement":
      prompt = `Rewrite as an internal company announcement:\n${prompt}`;
      break;
    default:
      break;
  }
  const draft = composeAiEmailDraft({
    prompt,
    style: draftStyle,
    authorName,
  });
  return {
    subject: source.subject || draft.subject,
    body: draft.body,
    note: `Rewritten · ${EMAIL_AI_REWRITE_LABELS[style]}`,
  };
}

export function estimateSpamScoreHint(input: {
  subject: string;
  body: string;
}): { score: number; label: string } {
  let score = 5;
  const text = `${input.subject}\n${input.body}`.toLowerCase();
  if (/free!!!|act now|click here|winner|congratulations you/i.test(text)) {
    score += 40;
  }
  if (/\$\$\$|100% free|limited time/i.test(text)) score += 25;
  if (/urgent|asap|!!!/i.test(text)) score += 10;
  if (input.subject === input.subject.toUpperCase() && input.subject.length > 8) {
    score += 15;
  }
  score = Math.min(95, score);
  const label =
    score < 20 ? "Low risk" : score < 45 ? "Moderate" : "Elevated — review tone";
  return { score, label };
}

export function analyzeExecutiveValidation(input: {
  to: string;
  subject: string;
  body: string;
  recipients?: RecipientCandidate[];
  hasAttachments?: boolean;
  recentSubjects?: string[];
  scheduledFor?: string | null;
}): Array<{ id: string; severity: "error" | "warning" | "info"; message: string }> {
  const findings: Array<{
    id: string;
    severity: "error" | "warning" | "info";
    message: string;
  }> = [];
  const recipients = input.recipients ?? [];
  const body = input.body.trim();
  const subject = input.subject.trim();

  // Duplicate recipients
  const labels = recipients.map((r) => r.id);
  if (new Set(labels).size !== labels.length) {
    findings.push({
      id: "duplicate-recipients",
      severity: "warning",
      message: "Duplicate recipients detected.",
    });
  }

  // Large recipient count
  const approxCount = recipients.reduce(
    (n, r) => n + Math.max(r.userIds.length, r.kind === "employee" ? 1 : 0),
    0,
  );
  if (approxCount >= 50) {
    findings.push({
      id: "large-audience",
      severity: "warning",
      message: `Large recipient count (~${approxCount}). Confirm before broadcast.`,
    });
  }

  // Outside business hours (local)
  const now = input.scheduledFor ? new Date(input.scheduledFor) : new Date();
  const hour = now.getHours();
  const day = now.getDay();
  if (day === 0 || day === 6 || hour < 8 || hour >= 19) {
    findings.push({
      id: "business-hours",
      severity: "info",
      message: "Outside typical business hours — consider scheduling.",
    });
  }

  // Sensitive information heuristics
  if (
    /\b(ssn|passport|salary|bank account|password|otp|credit card)\b/i.test(
      body + subject,
    )
  ) {
    findings.push({
      id: "sensitive",
      severity: "warning",
      message: "Possible sensitive information — review before sending.",
    });
  }

  // Possible typo in subject
  if (/\bteh\b|\badn\b|\bwoudl\b|\brecieve\b/i.test(subject + " " + body)) {
    findings.push({
      id: "typo",
      severity: "info",
      message: "Possible typo detected — review wording.",
    });
  }

  const spam = estimateSpamScoreHint({ subject, body });
  if (spam.score >= 45) {
    findings.push({
      id: "spam-hint",
      severity: "warning",
      message: `Spam score hint: ${spam.score}/100 (${spam.label}).`,
    });
  } else {
    findings.push({
      id: "spam-hint",
      severity: "info",
      message: `Spam score hint: ${spam.score}/100 (${spam.label}).`,
    });
  }

  if (
    /\b(attach|attached|attachment|enclosed)\b/i.test(body) &&
    !input.hasAttachments
  ) {
    findings.push({
      id: "missing-attachment",
      severity: "warning",
      message: "Attachment mentioned but missing.",
    });
  }

  if (
    subject &&
    (input.recentSubjects ?? []).some(
      (s) => s.trim().toLowerCase() === subject.toLowerCase(),
    )
  ) {
    findings.push({
      id: "duplicate-subject",
      severity: "warning",
      message: "Duplicate email warning — similar subject sent recently.",
    });
  }

  return findings;
}

export interface EmailAiInsights {
  queued: number;
  sending: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  openRateHint: number;
  replyRateHint: number;
  recentFailures: string[];
  recommendations: string[];
}

export function computeEmailAiInsights(
  queueItems: NotificationQueueDto[],
): EmailAiInsights {
  const queued = queueItems.filter((i) => i.status === "PENDING").length;
  const sending = queueItems.filter((i) => i.status === "PROCESSING").length;
  const delivered = queueItems.filter((i) => i.status === "SENT").length;
  const failed = queueItems.filter((i) => i.status === "FAILED").length;
  const total = Math.max(queueItems.length, 1);
  const deliveryRate = Math.round((delivered / total) * 100);
  // Open/reply rates are not tracked server-side — provide conservative hints from delivery
  const openRateHint = Math.max(0, Math.round(deliveryRate * 0.55));
  const replyRateHint = Math.max(0, Math.round(deliveryRate * 0.18));
  const recentFailures = queueItems
    .filter((i) => i.status === "FAILED")
    .slice(0, 5)
    .map((i) => i.lastError || i.subject || "Failed delivery");

  const recommendations: string[] = [];
  if (failed > 0) {
    recommendations.push("Retry failed emails from the queue processor.");
  }
  if (queued > 10) {
    recommendations.push("Process the email queue to clear pending deliveries.");
  }
  if (deliveryRate < 80 && queueItems.length > 5) {
    recommendations.push("Review SMTP / Gmail provider configuration.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Delivery looks healthy. Keep using Confirm & Send for AI drafts.");
  }

  return {
    queued,
    sending,
    delivered,
    failed,
    deliveryRate,
    openRateHint,
    replyRateHint,
    recentFailures,
    recommendations,
  };
}

export type EmailAiCommandId =
  | "send_email"
  | "reply"
  | "forward"
  | "summarize_thread"
  | "translate"
  | "rewrite"
  | "schedule"
  | "cancel_schedule"
  | "mark_important"
  | "archive";

export const EMAIL_AI_COMMANDS: Array<{
  id: EmailAiCommandId;
  label: string;
  keywords: string[];
}> = [
  { id: "send_email", label: "Send email", keywords: ["send", "compose", "ask ai"] },
  { id: "reply", label: "Reply", keywords: ["reply"] },
  { id: "forward", label: "Forward", keywords: ["forward"] },
  {
    id: "summarize_thread",
    label: "Summarize thread",
    keywords: ["summarize", "summary"],
  },
  { id: "translate", label: "Translate", keywords: ["translate"] },
  { id: "rewrite", label: "Rewrite", keywords: ["rewrite"] },
  { id: "schedule", label: "Schedule", keywords: ["schedule", "tomorrow"] },
  {
    id: "cancel_schedule",
    label: "Cancel schedule",
    keywords: ["cancel schedule", "unschedule"],
  },
  {
    id: "mark_important",
    label: "Mark important",
    keywords: ["important", "star"],
  },
  { id: "archive", label: "Archive", keywords: ["archive"] },
];

export function filterEmailAiCommands(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return EMAIL_AI_COMMANDS;
  return EMAIL_AI_COMMANDS.filter(
    (c) =>
      c.label.toLowerCase().includes(q) ||
      c.keywords.some((k) => k.includes(q) || q.includes(k)),
  );
}

export function mapQueueStatusToLiveLabel(
  status: NotificationQueueDto["status"],
): "Queued" | "Sending" | "Delivered" | "Failed" | "Retried" {
  switch (status) {
    case "PENDING":
      return "Queued";
    case "PROCESSING":
      return "Sending";
    case "SENT":
      return "Delivered";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Failed";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function suggestScheduleIso(
  hint: "tomorrow" | "next_monday" | "custom",
  custom?: string,
): string {
  const d = new Date();
  switch (hint) {
    case "tomorrow":
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d.toISOString();
    case "next_monday": {
      const day = d.getDay();
      const add = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
      d.setDate(d.getDate() + add);
      d.setHours(9, 0, 0, 0);
      return d.toISOString();
    }
    case "custom":
      return custom ? new Date(custom).toISOString() : d.toISOString();
    default: {
      const _exhaustive: never = hint;
      return _exhaustive;
    }
  }
}

export function shortenDraftBody(body: string): string {
  return body
    .split(/\n+/)
    .filter(Boolean)
    .slice(0, 4)
    .join("\n\n");
}

export function lengthenDraftBody(body: string): string {
  return `${body}\n\nPlease confirm receipt and share any questions so we can proceed.\n\nThank you for your attention to this matter.`;
}

export function detectNlIntentHints(prompt: string): {
  style: EmailDraftStyle;
  groupHint?: string;
} {
  const p = prompt.toLowerCase();
  let groupHint: string | undefined;
  if (/lahore|branch|office/.test(p)) groupHint = "office";
  if (/engineering|developers|dev team/.test(p)) groupHint = "engineering";
  if (/operations|ops team/.test(p)) groupHint = "operations";
  if (/entire sales|sales team/.test(p)) groupHint = "sales";
  if (/marketing team|inform marketing/.test(p)) groupHint = "marketing";
  return { style: detectDraftStyle(prompt), groupHint };
}

export function threadParticipants(messages: EmailMessage[]): string[] {
  const set = new Set<string>();
  for (const m of messages) {
    set.add(m.fromName);
    for (const t of m.to) set.add(t);
  }
  return [...set];
}

export function emptyComposeWithAi(
  draft: EmailComposeDraft,
  patch: Partial<EmailComposeDraft>,
): EmailComposeDraft {
  return {
    ...draft,
    ...patch,
    aiGenerated: true,
    updatedAt: new Date().toISOString(),
  };
}
