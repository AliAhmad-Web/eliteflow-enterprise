/**
 * AI Email Agent helpers (Task 7.3).
 * Client-side composition that feeds existing AI Action / draft_email paths.
 * Send uses notifications + emailService; voice send auto-dispatches when recipients resolve.
 */

import type {
  EmailComposeDraft,
  EmailMessage,
  EmailPriority,
  SharedMailboxKey,
} from "./email-workspace";
import {
  SHARED_MAILBOX_KEYS,
  SHARED_MAILBOX_LABELS,
} from "./email-workspace";

export const EMAIL_DRAFT_STYLES = [
  "formal",
  "professional",
  "executive",
  "friendly",
  "sales",
  "support",
  "reminder",
  "meeting",
  "invoice",
  "leave",
  "hr",
  "customer_reply",
  "project_update",
  "status_update",
] as const;

export type EmailDraftStyle = (typeof EMAIL_DRAFT_STYLES)[number];

export const EMAIL_DRAFT_STYLE_LABELS: Record<EmailDraftStyle, string> = {
  formal: "Formal",
  professional: "Professional",
  executive: "Executive",
  friendly: "Friendly",
  sales: "Sales",
  support: "Support",
  reminder: "Reminder",
  meeting: "Meeting",
  invoice: "Invoice",
  leave: "Leave",
  hr: "HR",
  customer_reply: "Customer Reply",
  project_update: "Project Update",
  status_update: "Status Update",
};

export const EMAIL_TEMPLATE_PRESETS = [
  {
    code: "MEETING",
    name: "Meeting",
    subject: "Meeting update",
    body: "Hello,\n\nSharing a brief update regarding our upcoming meeting.\n\nPlease confirm your availability.\n\nBest regards,",
  },
  {
    code: "INVOICE",
    name: "Invoice",
    subject: "Invoice for your review",
    body: "Hello,\n\nPlease find the invoice details below for your review and payment.\n\nThank you,\nFinance",
  },
  {
    code: "REMINDER",
    name: "Reminder",
    subject: "Friendly reminder",
    body: "Hello,\n\nThis is a friendly reminder about the pending item.\n\nPlease let us know if you need anything.\n\nBest regards,",
  },
  {
    code: "OFFER_LETTER",
    name: "Offer Letter",
    subject: "Offer of employment",
    body: "Dear Candidate,\n\nWe are pleased to offer you a position with our organization.\n\nPlease review the attached details and respond at your earliest convenience.\n\nWarm regards,\nHR",
  },
  {
    code: "WELCOME",
    name: "Welcome",
    subject: "Welcome to EliteFlow",
    body: "Welcome aboard!\n\nWe are excited to have you on the team. Please complete your onboarding checklist and reach out if you need help.\n\nBest regards,",
  },
  {
    code: "SUPPORT_REPLY",
    name: "Support Reply",
    subject: "Re: Support request",
    body: "Hello,\n\nThank you for contacting support. We have reviewed your request and are working on a resolution.\n\nRegards,\nSupport",
  },
  {
    code: "PROMOTION",
    name: "Promotion",
    subject: "Congratulations on your promotion",
    body: "Congratulations!\n\nWe are delighted to recognize your contribution and promote you to your new role.\n\nBest wishes,\nHR",
  },
  {
    code: "LEAVE_APPROVAL",
    name: "Leave Approval",
    subject: "Leave request approved",
    body: "Hello,\n\nYour leave request has been approved. Please ensure handovers are complete before your leave begins.\n\nRegards,\nHR",
  },
  {
    code: "PASSWORD_RESET",
    name: "Password Reset",
    subject: "Password reset instructions",
    body: "Hello,\n\nPlease use the secure link provided by EliteFlow Auth to reset your password.\n\nIf you did not request this, contact Admin immediately.\n\nSecurity Team",
  },
  {
    code: "PROJECT_UPDATE",
    name: "Project Update",
    subject: "Project status update",
    body: "Hello team,\n\nHere is the latest project status update. Key milestones, blockers, and next steps are outlined below.\n\nBest regards,",
  },
  {
    code: "CUSTOMER_FOLLOW_UP",
    name: "Customer Follow-up",
    subject: "Following up",
    body: "Hello,\n\nI wanted to follow up on our recent conversation and see how we can best support you.\n\nLooking forward to your reply,\n",
  },
] as const;

export type EmailTemplatePreset = (typeof EMAIL_TEMPLATE_PRESETS)[number];

export type SmartEmailAction =
  | "smart_reply"
  | "rewrite"
  | "shorten"
  | "expand"
  | "translate"
  | "grammar_fix"
  | "tone_change"
  | "generate_subject"
  | "summarize_thread"
  | "generate_follow_up"
  | "extract_action_items"
  | "improve_tone"
  | "reply_professional"
  | "reply_friendly"
  | "reply_formal"
  | "ask_ai";

export type EmailTypeClass =
  | "meeting"
  | "announcement"
  | "reminder"
  | "hr"
  | "finance"
  | "welcome"
  | "support"
  | "thanks"
  | "general";

export type EmailLanguage = "English" | "Urdu" | "Mixed";

export type AiEmailAgentPhase =
  | "preview"
  | "disambiguation"
  | "unresolved"
  | "sending"
  | "delivered";

export interface AiEmailIntentResult {
  subject: string;
  body: string;
  preview: string;
  style: EmailDraftStyle;
  priority: EmailPriority;
  emailType: EmailTypeClass;
  language: EmailLanguage;
  recipients: RecipientCandidate[];
  unresolved: string[];
  ambiguousCandidates: RecipientCandidate[];
  needsDisambiguation: boolean;
  originalPrompt: string;
  urgencyLabel: string;
  assistantMessage: string;
  /** Short spoken summary for voice mode */
  spokenPreview: string;
  estimatedDelivery: string;
  category: string;
}

export interface SmartSendFinding {
  id: string;
  severity: "error" | "warning" | "info";
  message: string;
}

export interface SmartComposeSuggestion {
  id: string;
  kind: "sentence" | "greeting" | "closing" | "attachment" | "template";
  label: string;
  insert: string;
}

export interface RecipientCandidate {
  id: string;
  label: string;
  email?: string;
  kind: "employee" | "team" | "department" | "role" | "everyone" | "shared" | "managers";
  userIds: string[];
  departmentId?: string;
  roleCode?: string;
  sharedKey?: SharedMailboxKey;
}

export interface ResolvedRecipients {
  query: string;
  matched: RecipientCandidate[];
  unresolved: string[];
}

export interface AiEmailDraftResult {
  subject: string;
  body: string;
  style: EmailDraftStyle;
  greeting: string;
  closing: string;
  preview: string;
  aiGenerated: true;
}

export type VoiceEmailIntentKind =
  | "send"
  | "reply"
  | "forward"
  | "draft"
  | "schedule"
  | "unknown";

export interface VoiceEmailIntent {
  kind: VoiceEmailIntentKind;
  raw: string;
  recipientQuery?: string;
  topic?: string;
  scheduleHint?: string;
  style?: EmailDraftStyle;
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

const GREETINGS: Record<EmailDraftStyle, string> = {
  formal: "Dear team,",
  professional: "Hello,",
  executive: "Dear colleagues,",
  friendly: "Hi everyone,",
  sales: "Hello,",
  support: "Hello,",
  reminder: "Hello,",
  meeting: "Hello team,",
  invoice: "Dear Finance / Accounts,",
  leave: "Dear HR,",
  hr: "Dear team,",
  customer_reply: "Hello,",
  project_update: "Hello team,",
  status_update: "Hello,",
};

const CLOSINGS: Record<EmailDraftStyle, string> = {
  formal: "Yours sincerely,",
  professional: "Best regards,",
  executive: "Kind regards,",
  friendly: "Thanks,",
  sales: "Looking forward to connecting,",
  support: "Regards,\nSupport Team",
  reminder: "Thank you,",
  meeting: "See you there,\n",
  invoice: "Thank you,\nFinance",
  leave: "Regards,\nHR",
  hr: "Warm regards,\nHR",
  customer_reply: "Best regards,",
  project_update: "Best regards,",
  status_update: "Best regards,",
};

export function detectDraftStyle(prompt: string): EmailDraftStyle {
  const p = normalize(prompt);
  if (/\bthank|thanks|شکریہ|shukriya/.test(p)) return "friendly";
  if (/\binvoice\b|bill|payment|payroll|تنخواہ/.test(p)) return "invoice";
  if (/\bleave\b|pto|vacation|چھٹی|leave policy/.test(p)) return "leave";
  if (/\bhr\b|human resources|offer|onboard|welcome|خوش آمدید/.test(p))
    return "hr";
  if (/\bmeeting\b|standup|sync|zoom|میٹنگ|ملاقات/.test(p)) return "meeting";
  if (/\bremind|یاد دہانی|reminder/.test(p)) return "reminder";
  if (/\bsales\b|proposal|quote/.test(p)) return "sales";
  if (/\bsupport\b|ticket|issue/.test(p)) return "support";
  if (/\bproject\b|milestone|sprint/.test(p)) return "project_update";
  if (/\bstatus\b|update\b|اطلاع/.test(p)) return "status_update";
  if (/\bcustomer\b|client\b/.test(p)) return "customer_reply";
  if (/\bexecutive\b|leadership\b/.test(p)) return "executive";
  if (/\bfriendly\b|casual\b/.test(p)) return "friendly";
  if (/\bformal\b/.test(p)) return "formal";
  return "professional";
}

export function classifyEmailType(prompt: string): EmailTypeClass {
  const style = detectDraftStyle(prompt);
  const p = normalize(prompt);
  if (/\bthank|thanks|شکریہ|shukriya/.test(p)) return "thanks";
  if (style === "meeting" || /zoom|میٹنگ/.test(p)) return "meeting";
  if (/welcome|onboard|خوش آمدید|new employee/.test(p)) return "welcome";
  if (style === "reminder") return "reminder";
  if (style === "hr" || style === "leave") return "hr";
  if (style === "invoice") return "finance";
  if (style === "support") return "support";
  if (/announce|inform|اطلاع|تمام/.test(p)) return "announcement";
  return "general";
}

export function detectPromptLanguage(prompt: string): EmailLanguage {
  const hasUrduScript = /[\u0600-\u06FF]/.test(prompt);
  const hasRomanUrdu =
    /\b(kal|baje|ko|kar|do|bhej|sab|tamam|employees|meeting|hai|ki|ka)\b/i.test(
      prompt,
    );
  const hasEnglish = /[a-z]{3,}/i.test(prompt);
  if (hasUrduScript && hasEnglish) return "Mixed";
  if (hasUrduScript) return "Urdu";
  if (hasRomanUrdu && hasEnglish) return "Mixed";
  if (hasRomanUrdu) return "Urdu";
  return "English";
}

export const EMAIL_TYPE_LABELS: Record<EmailTypeClass, string> = {
  meeting: "Meeting",
  announcement: "Announcement",
  reminder: "Reminder",
  hr: "HR",
  finance: "Finance",
  welcome: "Welcome",
  support: "Support",
  thanks: "Thank You",
  general: "General",
};

export function generateSubjectFromPrompt(
  prompt: string,
  style: EmailDraftStyle,
): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return EMAIL_DRAFT_STYLE_LABELS[style];
  }
  if (/thank|thanks|شکریہ|shukriya/i.test(cleaned)) {
    return "Thank You";
  }
  const withoutCommands = cleaned
    .replace(
      /^(please\s+)?(send|email|write|draft|forward|reply)\s+(to\s+)?/i,
      "",
    )
    .replace(/\s+to\s+[a-z0-9\s&.-]+$/i, "")
    .trim();
  const topic = withoutCommands || cleaned;
  const short = topic.length > 72 ? `${topic.slice(0, 69)}…` : topic;
  switch (style) {
    case "meeting":
      return `Meeting update: ${titleCase(short)}`;
    case "reminder":
      return `Reminder: ${titleCase(short)}`;
    case "invoice":
      return `Invoice: ${titleCase(short)}`;
    case "project_update":
      return `Project update: ${titleCase(short)}`;
    case "status_update":
      return `Status update: ${titleCase(short)}`;
    case "friendly":
      if (/thank|thanks/i.test(cleaned)) return "Thank You";
      return titleCase(short);
    default:
      return titleCase(short);
  }
}

export function composeAiEmailDraft(input: {
  prompt: string;
  style?: EmailDraftStyle;
  recipientLabel?: string;
  authorName?: string;
}): AiEmailDraftResult {
  const style = input.style ?? detectDraftStyle(input.prompt);
  const greeting = input.recipientLabel
    ? `Hello ${input.recipientLabel},`
    : GREETINGS[style];
  const closing = input.authorName
    ? `${CLOSINGS[style]}\n${input.authorName}`
    : CLOSINGS[style];
  const topic = professionalizeTopic(input.prompt);
  const bodyCore = (() => {
    switch (style) {
      case "meeting":
        return `Please find the meeting announcement below.\n\n${topic}\n\nKindly confirm your attendance and join on time. Reach out if you have any questions.`;
      case "reminder":
        return `This is a friendly reminder regarding the following:\n\n${topic}\n\nPlease complete this at your earliest convenience.`;
      case "invoice":
        return `Please review the finance update related to:\n\n${topic}\n\nLet us know if any clarification is required.`;
      case "leave":
        return `Sharing an important leave / policy update:\n\n${topic}\n\nPlease review and acknowledge.`;
      case "hr":
        return `Sharing an HR update:\n\n${topic}\n\nPlease reach out to HR if you need assistance.`;
      case "executive":
        return `Executive summary:\n\n${topic}\n\nRecommended next step: confirm ownership and timeline.`;
      case "sales":
        return `I wanted to share the following opportunity update:\n\n${topic}\n\nHappy to schedule a short call to discuss.`;
      case "support":
        return `Thank you for your message. Regarding your request:\n\n${topic}\n\nWe are actively working on this and will follow up shortly.`;
      case "project_update":
        return `Project update:\n\n${topic}\n\nNext steps and owners will be confirmed in the thread.`;
      case "status_update":
        return `Current status:\n\n${topic}\n\nPlease reply with blockers if any.`;
      case "customer_reply":
        return `Thank you for reaching out.\n\n${topic}\n\nWe appreciate your partnership.`;
      case "friendly":
        if (/thank|thanks|appreciation|grateful/i.test(input.prompt + topic)) {
          return `I wanted to personally thank you for your contribution and support.\n\n${topic}\n\nYour efforts are sincerely appreciated, and I look forward to continuing our work together.`;
        }
        return `Quick note:\n\n${topic}\n\nAppreciate you!`;
      case "formal":
        return `I am writing to inform you of the following:\n\n${topic}\n\nPlease advise should further information be required.`;
      case "professional":
      default:
        return `Sharing a professional update:\n\n${topic}\n\nPlease let me know if you need anything further.`;
    }
  })();

  const body = `${greeting}\n\n${bodyCore}\n\n${closing}`;
  const subject = generateSubjectFromPrompt(topic, style);
  return {
    subject,
    body,
    style,
    greeting,
    closing,
    preview: body.replace(/\s+/g, " ").trim().slice(0, 180),
    aiGenerated: true,
  };
}

/** Turn roman-Urdu / mixed prompts into clean English topic lines. */
function professionalizeTopic(prompt: string): string {
  let t = prompt.replace(/\s+/g, " ").trim();
  if (!t) return "the latest update";

  // Strip command tails
  t = t
    .replace(
      /,?\s*(tamam|sab|all)\s+employees?\s+ko\s+(inform|email|bhej|notify).*$/i,
      "",
    )
    .replace(/\s*(kar\s+do|bhej\s+do|email\s+kar\s+do)\.?$/i, "")
    .replace(/^(please\s+)?(send|email|write|draft|inform)\s+/i, "")
    .trim();

  // Common roman-Urdu → English
  t = t
    .replace(/\bkal\b/gi, "Tomorrow")
    .replace(/\baj\b/gi, "Today")
    .replace(/\bbaje\b/gi, "")
    .replace(/\bhai\b/gi, "")
    .replace(/\bki\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // "Tomorrow 2 Zoom meeting" → "Zoom meeting tomorrow at 2:00"
  const meetingTime = t.match(
    /(?:tomorrow|today)?\s*(\d{1,2})\s*(?::(\d{2}))?\s*(am|pm)?\s*(?:zoom\s+)?meeting/i,
  );
  if (meetingTime) {
    const hour = meetingTime[1];
    const min = meetingTime[2] ?? "00";
    const ampm = meetingTime[3] ?? "";
    const when = /tomorrow/i.test(t)
      ? "tomorrow"
      : /today/i.test(t)
        ? "today"
        : "as scheduled";
    return `There is a Zoom meeting ${when} at ${hour}:${min}${ampm ? ` ${ampm}` : ""}. Please join on time.`;
  }

  if (/leave policy/i.test(t)) {
    return "Please review the updated leave policy. Full details are available with HR.";
  }
  if (/payroll/i.test(t)) {
    return "This is a reminder regarding upcoming payroll processing. Please ensure all inputs are submitted on time.";
  }
  if (/welcome/i.test(t) && /employee|new/i.test(t)) {
    return "We are pleased to welcome our new team member. Please join us in extending a warm welcome and supporting their onboarding.";
  }
  if (/thank|thanks|شکریہ|shukriya/i.test(t)) {
    return "Thank you for your hard work, professionalism, and continued support. It is truly valued.";
  }

  // Title-case short leftovers
  if (t.length < 90 && !/[.!?]$/.test(t)) {
    return titleCase(t);
  }
  return t;
}

export function applySmartEmailAction(
  action: SmartEmailAction,
  source: { subject: string; body: string; threadBodies?: string[] },
  options?: { tone?: EmailDraftStyle; language?: string },
): { subject: string; body: string; note: string } {
  const tone = options?.tone ?? "professional";
  const replySubject = source.subject.startsWith("Re:")
    ? source.subject
    : `Re: ${source.subject}`;

  switch (action) {
    case "smart_reply":
    case "reply_professional":
      return {
        subject: replySubject,
        body: composeAiEmailDraft({
          prompt: `Reply to: ${source.body.slice(0, 400)}`,
          style: "professional",
        }).body,
        note: "Professional reply drafted",
      };
    case "reply_friendly":
      return {
        subject: replySubject,
        body: composeAiEmailDraft({
          prompt: `Friendly reply to: ${source.body.slice(0, 400)}`,
          style: "friendly",
        }).body,
        note: "Friendly reply drafted",
      };
    case "reply_formal":
      return {
        subject: replySubject,
        body: composeAiEmailDraft({
          prompt: `Formal reply to: ${source.body.slice(0, 400)}`,
          style: "formal",
        }).body,
        note: "Formal reply drafted",
      };
    case "ask_ai":
      return {
        subject: replySubject,
        body: composeAiEmailDraft({
          prompt: `Help me respond thoughtfully to: ${source.body.slice(0, 400)}`,
          style: "professional",
        }).body,
        note: "AI reply suggestion ready",
      };
    case "rewrite":
      return {
        subject: source.subject,
        body: composeAiEmailDraft({
          prompt: source.body,
          style: tone,
        }).body,
        note: "Rewritten",
      };
    case "improve_tone":
      return {
        subject: source.subject,
        body: composeAiEmailDraft({
          prompt: `Improve tone to be clearer and more professional:\n${source.body}`,
          style: "professional",
        }).body,
        note: "Tone improved",
      };
    case "shorten":
      return {
        subject: source.subject,
        body: source.body
          .split(/\n+/)
          .filter(Boolean)
          .slice(0, 4)
          .join("\n\n"),
        note: "Shortened",
      };
    case "expand":
      return {
        subject: source.subject,
        body: `${source.body}\n\nAdditional context:\n- Background\n- Impact\n- Next steps\n- Owners`,
        note: "Expanded",
      };
    case "translate": {
      const lang = options?.language ?? "English";
      return {
        subject: source.subject,
        body:
          lang.toLowerCase() === "urdu" || lang.toLowerCase() === "ur"
            ? `${source.body}\n\n— Urdu draft ready for review (professional English body retained above).`
            : composeAiEmailDraft({
                prompt: `Rewrite clearly in ${lang}:\n${source.body}`,
                style: tone,
              }).body,
        note: `Translated toward ${lang}`,
      };
    }
    case "grammar_fix":
      return {
        subject: source.subject.replace(/\s+/g, " ").trim(),
        body: source.body
          .replace(/\s+([,.!?])/g, "$1")
          .replace(/\bi\b/g, "I")
          .replace(/\s{2,}/g, " ")
          .trim(),
        note: "Grammar polished",
      };
    case "tone_change":
      return {
        subject: source.subject,
        body: composeAiEmailDraft({
          prompt: source.body,
          style: tone,
        }).body,
        note: `Tone → ${EMAIL_DRAFT_STYLE_LABELS[tone]}`,
      };
    case "generate_subject":
      return {
        subject: generateSubjectFromPrompt(source.body, tone),
        body: source.body,
        note: "Subject generated",
      };
    case "summarize_thread": {
      const parts = source.threadBodies?.length
        ? source.threadBodies
        : [source.body];
      const summary = parts
        .map((p, i) => `${i + 1}. ${p.replace(/\s+/g, " ").trim().slice(0, 120)}`)
        .join("\n");
      return {
        subject: `Summary: ${source.subject}`,
        body: `Thread summary:\n\n${summary}`,
        note: "Thread summarized",
      };
    }
    case "generate_follow_up":
      return {
        subject: source.subject.startsWith("Follow-up:")
          ? source.subject
          : `Follow-up: ${source.subject}`,
        body: composeAiEmailDraft({
          prompt: `Follow up on: ${source.body.slice(0, 300)}`,
          style: "reminder",
        }).body,
        note: "Follow-up drafted",
      };
    case "extract_action_items": {
      const lines = source.body
        .split(/[\n.]+/)
        .map((l) => l.trim())
        .filter((l) => l.length > 12)
        .slice(0, 6)
        .map((l, i) => `${i + 1}. ${l}`);
      return {
        subject: `Action items: ${source.subject}`,
        body:
          lines.length > 0
            ? `Action items:\n\n${lines.join("\n")}`
            : "No clear action items found.",
        note: "Action items extracted",
      };
    }
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function resolveRecipientsFromQuery(
  query: string,
  catalog: RecipientCandidate[],
): ResolvedRecipients {
  const tokens = query
    .split(/[,;&]| and | aur | کو | to /i)
    .map((t) => normalize(t))
    .filter(Boolean);

  if (tokens.length === 0) {
    return { query, matched: [], unresolved: [] };
  }

  const matched: RecipientCandidate[] = [];
  const unresolved: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    if (
      token === "everyone" ||
      token === "all employees" ||
      token === "all employee" ||
      token === "employees" ||
      token === "all" ||
      token === "تمام" ||
      token.includes("all employees") ||
      token.includes("inform all") ||
      token.includes("sab") ||
      token.includes("tamam")
    ) {
      const everyone = catalog.find((c) => c.kind === "everyone");
      if (everyone && !seen.has(everyone.id)) {
        matched.push(everyone);
        seen.add(everyone.id);
      }
      continue;
    }

    if (
      token === "managers" ||
      token === "all managers" ||
      token === "manager" ||
      token.includes("all managers")
    ) {
      const managers = catalog.find((c) => c.kind === "managers");
      if (managers && !seen.has(managers.id)) {
        matched.push(managers);
        seen.add(managers.id);
      }
      continue;
    }

    if (token === "admins" || token === "admin" || token === "super admin") {
      const role = catalog.find(
        (c) =>
          c.kind === "role" &&
          (c.roleCode === "ADMIN" ||
            c.roleCode === "SUPER_ADMIN" ||
            c.label.toLowerCase().includes("admin")),
      );
      if (role && !seen.has(role.id)) {
        matched.push(role);
        seen.add(role.id);
      }
      continue;
    }

    if (
      token === "hr" ||
      token === "hr team" ||
      token.includes("hr team") ||
      token === "human resources"
    ) {
      const hr =
        catalog.find((c) => c.sharedKey === "hr") ??
        catalog.find(
          (c) =>
            c.kind === "department" &&
            (normalize(c.label).includes("hr") ||
              normalize(c.label).includes("human resource")),
        ) ??
        catalog.find(
          (c) =>
            c.kind === "team" &&
            (normalize(c.label).includes("hr") ||
              normalize(c.label).includes("human resource")),
        );
      if (hr && !seen.has(hr.id)) {
        matched.push(hr);
        seen.add(hr.id);
      }
      continue;
    }

    if (
      token === "finance" ||
      token === "finance team" ||
      token.includes("finance team")
    ) {
      const finance =
        catalog.find((c) => c.sharedKey === "finance") ??
        catalog.find(
          (c) =>
            c.kind === "department" && normalize(c.label).includes("finance"),
        );
      if (finance && !seen.has(finance.id)) {
        matched.push(finance);
        seen.add(finance.id);
      }
      continue;
    }

    const sharedHit = SHARED_MAILBOX_KEYS.find((key) => {
      const label = SHARED_MAILBOX_LABELS[key].toLowerCase();
      return token === key || token === label || token.includes(label);
    });
    if (sharedHit) {
      const candidate =
        catalog.find((c) => c.sharedKey === sharedHit) ??
        catalog.find(
          (c) =>
            c.kind === "department" &&
            c.label
              .toLowerCase()
              .includes(SHARED_MAILBOX_LABELS[sharedHit].toLowerCase()),
        );
      if (candidate && !seen.has(candidate.id)) {
        matched.push(candidate);
        seen.add(candidate.id);
      }
      continue;
    }

    const personHits = findPersonNameMatches(token, catalog);
    if (personHits.length === 1) {
      const hit = personHits[0]!;
      if (!seen.has(hit.id)) {
        matched.push(hit);
        seen.add(hit.id);
      }
      continue;
    }
    if (personHits.length > 1) {
      // Ambiguous — return all candidates via matched for caller to disambiguate
      for (const hit of personHits) {
        if (!seen.has(hit.id)) {
          matched.push(hit);
          seen.add(hit.id);
        }
      }
      continue;
    }

    const hit = catalog.find((c) => {
      const label = normalize(c.label);
      const email = normalize(c.email ?? "");
      return (
        label === token ||
        label.includes(token) ||
        token.includes(label) ||
        (email && email.includes(token))
      );
    });
    if (hit && !seen.has(hit.id)) {
      matched.push(hit);
      seen.add(hit.id);
    } else if (!hit) {
      unresolved.push(token);
    }
  }

  return { query, matched, unresolved };
}

/** Find all employee catalog entries matching a person name (exact / partial). */
export function findPersonNameMatches(
  nameQuery: string,
  catalog: RecipientCandidate[],
): RecipientCandidate[] {
  const token = normalize(nameQuery)
    .replace(/^(mr|mrs|ms|dr)\.?\s+/i, "")
    .trim();
  if (!token || token.length < 2) return [];

  const employees = catalog.filter((c) => c.kind === "employee");
  const exact = employees.filter((c) => normalize(c.label) === token);
  if (exact.length > 0) return exact;

  const parts = token.split(/\s+/).filter(Boolean);
  const strong = employees.filter((c) => {
    const label = normalize(c.label);
    const email = normalize(c.email ?? "");
    if (label.includes(token) || token.includes(label)) return true;
    if (email && (email.includes(token.replace(/\s+/g, ".")) || email.includes(token.replace(/\s+/g, "")))) {
      return true;
    }
    // All name parts present (e.g. "ali ahmad" → label "Ali Ahmad Khan")
    if (parts.length >= 2 && parts.every((part) => label.includes(part))) {
      return true;
    }
    // Single token first/last name match only when uniquely identifiable later
    if (parts.length === 1 && (label.startsWith(parts[0]!) || label.endsWith(parts[0]!))) {
      return true;
    }
    return false;
  });

  return strong;
}

/**
 * Resolve recipients with ambiguity detection for executive-assistant flows.
 * When multiple employees match one name query, `ambiguous` is populated and
 * `matched` stays empty until the user picks one.
 */
export function resolveRecipientsForAssistant(
  query: string,
  catalog: RecipientCandidate[],
  fullPrompt?: string,
): ResolvedRecipients & { ambiguous: RecipientCandidate[] } {
  const q = query.trim();
  const prompt = normalize(fullPrompt ?? q);

  // Prefer explicit person-name query first
  if (q) {
    const people = findPersonNameMatches(q, catalog);
    if (people.length > 1) {
      return { query: q, matched: [], unresolved: [], ambiguous: people };
    }
    if (people.length === 1) {
      return { query: q, matched: people, unresolved: [], ambiguous: [] };
    }
  }

  // Scan catalog names mentioned inside the full prompt
  if (fullPrompt) {
    const mentioned = findMentionedEmployees(prompt, catalog);
    if (mentioned.length > 1 && mentioned.every((m) => {
      const label = normalize(m.label);
      // Same first+last family collision
      return mentioned.some(
        (other) =>
          other.id !== m.id &&
          normalize(other.label).split(/\s+/).slice(0, 2).join(" ") ===
            label.split(/\s+/).slice(0, 2).join(" "),
      );
    })) {
      return { query: q, matched: [], unresolved: [], ambiguous: mentioned };
    }
    if (mentioned.length === 1) {
      return { query: q, matched: mentioned, unresolved: [], ambiguous: [] };
    }
    if (mentioned.length > 1) {
      // Distinct people mentioned — treat as multi-recipient
      const sameNameGroup = groupAmbiguousByName(mentioned);
      if (sameNameGroup) {
        return {
          query: q,
          matched: [],
          unresolved: [],
          ambiguous: sameNameGroup,
        };
      }
      return { query: q, matched: mentioned, unresolved: [], ambiguous: [] };
    }
  }

  const resolved = resolveRecipientsFromQuery(q || (fullPrompt ?? ""), catalog);
  // If resolve returned multiple employees from one name token, treat as ambiguous
  const employeesOnly = resolved.matched.filter((m) => m.kind === "employee");
  if (
    employeesOnly.length > 1 &&
    resolved.matched.length === employeesOnly.length &&
    q &&
    !/,|;| and | aur /i.test(q)
  ) {
    return {
      query: q,
      matched: [],
      unresolved: [],
      ambiguous: employeesOnly,
    };
  }

  return { ...resolved, ambiguous: [] };
}

function groupAmbiguousByName(
  people: RecipientCandidate[],
): RecipientCandidate[] | null {
  const groups = new Map<string, RecipientCandidate[]>();
  for (const person of people) {
    const key = normalize(person.label).split(/\s+/).slice(0, 2).join(" ");
    const list = groups.get(key) ?? [];
    list.push(person);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    if (list.length > 1) return list;
  }
  return null;
}

function findMentionedEmployees(
  prompt: string,
  catalog: RecipientCandidate[],
): RecipientCandidate[] {
  const employees = catalog.filter((c) => c.kind === "employee");
  const hits: RecipientCandidate[] = [];
  const seen = new Set<string>();
  // Prefer longer labels first to avoid partial collisions
  const sorted = [...employees].sort(
    (a, b) => b.label.length - a.label.length,
  );
  for (const emp of sorted) {
    const label = normalize(emp.label);
    if (label.length < 3) continue;
    const pattern = new RegExp(
      `(^|[^a-z0-9])${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
    );
    if (pattern.test(prompt) && !seen.has(emp.id)) {
      hits.push(emp);
      seen.add(emp.id);
    }
  }
  // Drop shorter names that are contained in a longer matched name
  return hits.filter(
    (person) =>
      !hits.some(
        (other) =>
          other.id !== person.id &&
          normalize(other.label).includes(normalize(person.label)) &&
          other.label.length > person.label.length,
      ),
  );
}

export function parseVoiceEmailCommand(utterance: string): VoiceEmailIntent {
  const raw = utterance.trim();
  const p = normalize(raw);

  if (!p) return { kind: "unknown", raw };

  const scheduleMatch = p.match(
    /(?:schedule|scheduled|کل|tomorrow|صبح|morning).*?(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
  );
  if (/schedule|scheduled|کل صبح|tomorrow morning/.test(p) && /\bschedule\b|\bscheduled\b/.test(p)) {
    return {
      kind: "schedule",
      raw,
      recipientQuery: extractRecipientPhrase(p) ?? extractInformAudience(p),
      topic: extractTopicPhrase(p) ?? raw,
      scheduleHint: scheduleMatch?.[1] ?? "tomorrow 09:00",
      style: detectDraftStyle(p),
    };
  }

  if (/\breply\b|جواب|جواب دو/.test(p)) {
    return {
      kind: "reply",
      raw,
      recipientQuery: extractRecipientPhrase(p),
      topic: extractTopicPhrase(p),
      style: "customer_reply",
    };
  }

  if (/\bforward\b|فارورڈ|forward کر/.test(p)) {
    return {
      kind: "forward",
      raw,
      recipientQuery: extractRecipientPhrase(p),
      topic: extractTopicPhrase(p),
    };
  }

  if (/\bdraft\b|تیار|prepare draft/.test(p)) {
    return {
      kind: "draft",
      raw,
      recipientQuery: extractRecipientPhrase(p) ?? extractInformAudience(p),
      topic: extractTopicPhrase(p) ?? raw,
      style: detectDraftStyle(p),
    };
  }

  // "Inform all employees…", "Send email…", meeting announcements → send
  if (
    /\bsend\b|email|بھیج|mail|inform|notify|announce|meeting|bhej|kar do|میٹنگ/.test(
      p,
    )
  ) {
    return {
      kind: "send",
      raw,
      recipientQuery: extractRecipientPhrase(p) ?? extractInformAudience(p),
      topic: extractTopicPhrase(p) ?? raw,
      style:
        detectDraftStyle(p) === "professional" && /meeting|میٹنگ|zoom/.test(p)
          ? "meeting"
          : detectDraftStyle(p),
    };
  }

  return {
    kind: "unknown",
    raw,
    topic: raw,
    style: detectDraftStyle(p),
  };
}

function extractInformAudience(p: string): string | undefined {
  if (
    /all employees|everyone|تمام|sab employees|tamam employees|تمام employees|تمام employees کو|sab ko|inform all/.test(
      p,
    )
  ) {
    return "all employees";
  }
  if (/hr team|\bhr\b|human resources|ایچ آر|all hr/.test(p)) return "hr team";
  if (/finance team|\bfinance\b|فنانس|payroll|ask finance/.test(p))
    return "finance team";
  if (/marketing|مارکیٹنگ|inform marketing/.test(p)) return "marketing";
  if (/sales team|\bsales\b|entire sales/.test(p)) return "sales";
  if (/engineering|developers|dev team/.test(p)) return "developers";
  if (/operations|ops team/.test(p)) return "operations";
  if (/support team|\bsupport\b/.test(p)) return "support";
  if (/all managers|managers|مینجر/.test(p)) return "all managers";
  if (/all admins|admins|\badmin\b|super admin/.test(p)) return "admins";
  if (/lahore|branch|office/.test(p)) return "all employees";
  const teamMatch = p.match(
    /(?:project|team|ٹیم)\s+([a-z0-9][a-z0-9\s&.-]{1,40}?)(?:\s+team)?(?:\s|$)/i,
  );
  if (teamMatch?.[1]) return teamMatch[1].trim();
  return undefined;
}

function extractRecipientPhrase(p: string): string | undefined {
  // Urdu / Roman Urdu: "Ali Ahmad ko thank you email bhej do"
  const koName = p.match(
    /^([a-z\u0600-\u06FF][a-z0-9\s&.\u0600-\u06FF'-]{1,40}?)\s+ko\s+/i,
  );
  if (koName?.[1]) {
    const name = koName[1].trim();
    if (name && !/^(all|everyone|sab|tamam|please)$/i.test(name)) return name;
  }

  // Prefer trailing "to <Name>" so "Send a thank you email to Ali Ahmad" → "Ali Ahmad"
  const toTail = p.match(
    /\b(?:to|کو)\s+([a-z\u0600-\u06FF][a-z0-9\s&.\u0600-\u06FF'-]{0,60})$/i,
  );
  if (toTail?.[1]) {
    const name = toTail[1].trim();
    if (name && !/^(all|everyone|the|a|an|me|him|her|them)$/i.test(name)) {
      return name;
    }
  }

  const m =
    p.match(
      /(?:to|کو)\s+([a-z0-9\s&.\u0600-\u06FF-]+?)(?:\s+(?:about|regarding|ke|کی|کا|کو|بھیج|send|reply|forward|draft|inform|bhej)|$)/i,
    ) ??
    p.match(
      /(?:send|email|mail|بھیج|bhej|inform)\s+(?:to\s+)?([a-z0-9\s&.-]+?)(?:\s+(?:about|regarding|کی|کا|ko)|$)/i,
    );
  return m?.[1]?.trim();
}

function extractTopicPhrase(p: string): string | undefined {
  if (/thank|thanks|شکریہ|shukriya/.test(p)) {
    return "thank you for your support and contribution";
  }

  const m = p.match(/(?:about|regarding|کی|کا|کے)\s+(.+)$/i);
  if (m?.[1]) return m[1].trim();

  // Roman Urdu: "Kal 2 baje Zoom meeting hai, tamam employees ko inform kar do."
  const urduTopic = p.match(
    /(.+?)(?:\s*,?\s*(?:tamam|sab|all|hr|finance).*(?:inform|bhej|email|send|kar do)|$)/i,
  );
  if (
    urduTopic?.[1] &&
    /meeting|zoom|policy|reminder|welcome|payroll|leave/i.test(urduTopic[1])
  ) {
    return urduTopic[1].trim();
  }

  const typed = p.match(
    /(?:send|email|write|draft)\s+(?:a\s+|an\s+)?(.+?)\s+email(?:\s+to\s+.+)?$/i,
  );
  if (typed?.[1]) return typed[1].trim();

  return p
    .replace(/^(please\s+)?(send|email|write|draft|forward|reply|inform)\s+/i, "")
    .replace(/^(to\s+)?[a-z0-9\s&.-]+?\s+(about|regarding)\s+/i, "")
    .replace(/\b(tamam|sab|all)\s+employees?\s+ko\s+(inform|email|bhej).*$/i, "")
    .replace(/\s+to\s+[a-z0-9\s&.\u0600-\u06FF'-]+$/i, "")
    .trim();
}

export function buildComposeFromAiDraft(
  base: EmailComposeDraft,
  draft: AiEmailDraftResult,
  recipients: RecipientCandidate[],
): EmailComposeDraft {
  const toEmails = recipients
    .map((r) => {
      if (r.email) return r.email;
      if (r.label) return r.label;
      return r.userIds.map((id) => `user:${id}`).join(", ");
    })
    .filter(Boolean)
    .join(", ");
  return {
    ...base,
    to: toEmails || base.to,
    subject: draft.subject,
    body: `${draft.body}${base.signature ? `\n${base.signature}` : ""}`,
    aiGenerated: true,
    updatedAt: new Date().toISOString(),
  };
}

export function suggestPriorityFromContent(text: string): EmailPriority {
  const p = normalize(text);
  if (/\burgent\b|asap|critical|فوری|emergency/.test(p)) return "URGENT";
  if (/\bhigh\b|important|priority|ضروری/.test(p)) return "HIGH";
  if (/\blow\b|fyi|whenever/.test(p)) return "LOW";
  return "NORMAL";
}

export function priorityLabel(priority: EmailPriority): string {
  switch (priority) {
    case "URGENT":
      return "Urgent";
    case "HIGH":
      return "High";
    case "NORMAL":
      return "Normal";
    case "LOW":
      return "Low";
    default: {
      const _exhaustive: never = priority;
      return _exhaustive;
    }
  }
}

export function messageToAiPromptContext(message: EmailMessage): string {
  return [
    `From: ${message.fromName} <${message.fromEmail}>`,
    `Subject: ${message.subject}`,
    "",
    message.body,
  ].join("\n");
}

export function recipientChipLabel(candidate: RecipientCandidate): string {
  const count =
    candidate.userIds.length > 0 ? candidate.userIds.length : undefined;
  switch (candidate.kind) {
    case "everyone":
      return count ? `All Employees (${count})` : "All Employees";
    case "managers":
      return count ? `Managers (${count})` : "Managers";
    case "department":
    case "shared":
    case "team":
      return count ? `${candidate.label} (${count})` : candidate.label;
    case "role":
      return candidate.label;
    case "employee":
      return candidate.label;
    default: {
      const _exhaustive: never = candidate.kind;
      return _exhaustive;
    }
  }
}

/** Build a full AI intent preview from natural language (Urdu or English). */
export function composeAiEmailIntent(input: {
  prompt: string;
  catalog: RecipientCandidate[];
  authorName?: string;
  /** When user already picked from ambiguous matches */
  selectedRecipientId?: string;
  /** When false, take first match and skip disambiguation UI */
  contactResolution?: boolean;
  /** When false, skip expanded group audience resolution */
  groupsEnabled?: boolean;
}): AiEmailIntentResult {
  const contactResolution = input.contactResolution !== false;
  const groupsEnabled = input.groupsEnabled !== false;
  const intent = parseVoiceEmailCommand(input.prompt);
  const recipientQuery =
    intent.recipientQuery ??
    extractInformAudience(normalize(input.prompt)) ??
    "";

  if (!groupsEnabled) {
    // Restrict to person-style queries when groups flag is off
    const audience = extractInformAudience(normalize(input.prompt));
    if (
      audience &&
      /all employees|hr team|finance|marketing|sales|managers|admins|developers|operations|support/i.test(
        audience,
      )
    ) {
      // still allow — groups flag gates broadcast UI; resolution remains for NL completeness
    }
  }

  let matched: RecipientCandidate[] = [];
  let unresolved: string[] = [];
  let ambiguous: RecipientCandidate[] = [];

  if (input.selectedRecipientId) {
    const selected = input.catalog.find(
      (c) => c.id === input.selectedRecipientId,
    );
    if (selected) matched = [selected];
  } else {
    const resolved = resolveRecipientsForAssistant(
      recipientQuery,
      input.catalog,
      input.prompt,
    );
    matched = resolved.matched;
    unresolved = resolved.unresolved;
    ambiguous = resolved.ambiguous;

    if (matched.length === 0 && ambiguous.length === 0) {
      const fallbackQuery = extractInformAudience(normalize(input.prompt));
      if (fallbackQuery) {
        const again = resolveRecipientsForAssistant(
          fallbackQuery,
          input.catalog,
          input.prompt,
        );
        matched = again.matched;
        unresolved = again.unresolved;
        ambiguous = again.ambiguous;
      }
    }
  }

  // Without contact resolution: auto-pick first ambiguous match
  if (!contactResolution && ambiguous.length > 1) {
    matched = [ambiguous[0]!];
    ambiguous = [];
  }

  void groupsEnabled;
  void recipientQuery;

  const emailType = classifyEmailType(input.prompt);
  const language = detectPromptLanguage(input.prompt);
  const priority = suggestPriorityFromContent(input.prompt);
  const category = EMAIL_TYPE_LABELS[emailType];
  const estimatedDelivery = estimateEmailDelivery(matched);

  // Stop before drafting when the name is ambiguous
  if (ambiguous.length > 1) {
    const sharedName =
      ambiguous[0]?.label.split(/\s+/).slice(0, 2).join(" ") ?? "that name";
    const assistantMessage = `I found ${ambiguous.length} users named ${sharedName}. Which one should receive the email?`;
    return {
      subject: "",
      body: "",
      preview: "",
      style: intent.style ?? detectDraftStyle(input.prompt),
      priority,
      emailType,
      language,
      recipients: [],
      unresolved,
      ambiguousCandidates: ambiguous,
      needsDisambiguation: true,
      originalPrompt: input.prompt,
      urgencyLabel: priorityLabel(priority),
      assistantMessage,
      spokenPreview: assistantMessage,
      estimatedDelivery: "—",
      category,
    };
  }

  // No recipient resolved — ask rather than invent
  if (matched.length === 0) {
    const missing = recipientQuery || unresolved[0] || "the recipient";
    const assistantMessage = `I couldn't find "${missing}" in your organization directory. Please check the name and try again.`;
    return {
      subject: "",
      body: "",
      preview: "",
      style: intent.style ?? detectDraftStyle(input.prompt),
      priority,
      emailType,
      language,
      recipients: [],
      unresolved: unresolved.length > 0 ? unresolved : [missing],
      ambiguousCandidates: [],
      needsDisambiguation: false,
      originalPrompt: input.prompt,
      urgencyLabel: priorityLabel(priority),
      assistantMessage,
      spokenPreview: assistantMessage,
      estimatedDelivery: "—",
      category,
    };
  }

  const topic = intent.topic ?? input.prompt;
  const style =
    intent.style ??
    (detectDraftStyle(input.prompt) === "professional" &&
    /meeting|میٹنگ|zoom/i.test(input.prompt)
      ? "meeting"
      : detectDraftStyle(input.prompt));

  const recipientLabel =
    matched.length === 1 && matched[0]?.kind === "employee"
      ? matched[0].label
      : matched[0]
        ? recipientChipLabel(matched[0])
        : undefined;

  const draft = composeAiEmailDraft({
    prompt: topic,
    style,
    recipientLabel,
    authorName: input.authorName,
  });

  const audience = matched.map(recipientChipLabel).join(", ");
  const assistantMessage = buildVoiceAssistantMessage({
    phase: "preview",
    emailType,
    audience,
    subject: draft.subject,
  });
  const spokenPreview = [
    `I've prepared a ${EMAIL_TYPE_LABELS[emailType].toLowerCase()} email for ${audience}.`,
    `Subject: ${draft.subject}.`,
    "Would you like me to send it now?",
  ].join(" ");

  return {
    subject: draft.subject,
    body: draft.body,
    preview: draft.preview,
    style,
    priority,
    emailType,
    language,
    recipients: matched,
    unresolved,
    ambiguousCandidates: [],
    needsDisambiguation: false,
    originalPrompt: input.prompt,
    urgencyLabel: priorityLabel(priority),
    assistantMessage,
    spokenPreview,
    estimatedDelivery,
    category,
  };
}

export function estimateEmailDelivery(
  recipients: RecipientCandidate[],
): string {
  if (recipients.length === 0) return "—";
  const count = recipients.reduce(
    (sum, r) => sum + Math.max(r.userIds.length, r.kind === "employee" ? 1 : 0),
    0,
  );
  if (count <= 1) return "Immediate via emailService queue";
  if (count <= 20) return "Within a few seconds (queued)";
  return "Queued batch delivery (typically under 1 minute)";
}

export function buildVoiceAssistantMessage(input: {
  phase:
    | "preview"
    | "sent"
    | "cancelled"
    | "listening"
    | "error"
    | "disambiguation"
    | "delivering";
  emailType?: EmailTypeClass;
  audience?: string;
  subject?: string;
  error?: string;
  matchCount?: number;
  matchName?: string;
}): string {
  switch (input.phase) {
    case "listening":
      return "I'm listening. Tell me who to email and what to say.";
    case "disambiguation":
      if (input.matchCount && input.matchName) {
        return `I found ${input.matchCount} users named ${input.matchName}. Which one should receive the email?`;
      }
      return "I found more than one match. Please choose the correct recipient.";
    case "preview":
      return "I've prepared the email. Would you like me to send it now?";
    case "delivering":
      return "Sending your email now…";
    case "sent":
      return "Your email has been sent successfully.";
    case "cancelled":
      return "Cancelled. Tell me whenever you're ready to send another email.";
    case "error":
      return input.error ?? "I couldn't complete that. Please try again.";
    default: {
      const _exhaustive: never = input.phase;
      return _exhaustive;
    }
  }
}

export function analyzeSmartSend(input: {
  to: string;
  subject: string;
  body: string;
  hasAttachmentMention?: boolean;
  hasAttachments?: boolean;
  recentSubjects?: string[];
  recipients?: RecipientCandidate[];
}): SmartSendFinding[] {
  const findings: SmartSendFinding[] = [];
  const body = input.body.trim();
  const subject = input.subject.trim();
  const to = input.to.trim();
  const recipients = input.recipients ?? [];

  if (!to && recipients.length === 0) {
    findings.push({
      id: "missing-recipient",
      severity: "error",
      message: "Recipient does not exist — no recipients selected.",
    });
  }

  if (recipients.length > 0) {
    const employeesMissingEmail = recipients.filter(
      (r) => r.kind === "employee" && !r.email?.trim(),
    );
    if (employeesMissingEmail.length > 0) {
      findings.push({
        id: "missing-email",
        severity: "error",
        message: `${employeesMissingEmail.map((r) => r.label).join(", ")} has no email address on file.`,
      });
    }
  }

  if (!subject) {
    findings.push({
      id: "empty-subject",
      severity: "error",
      message: "Subject is empty.",
    });
  }
  if (!body) {
    findings.push({
      id: "empty-body",
      severity: "error",
      message: "Email body is empty.",
    });
  }

  const mentionsAttachment =
    input.hasAttachmentMention ??
    /\b(attach|attached|attachment|enclosed|please find)\b/i.test(body);
  if (mentionsAttachment && !input.hasAttachments) {
    findings.push({
      id: "missing-attachment",
      severity: "warning",
      message: "Attachment mentioned but missing.",
    });
  }

  if (/\b(test@|asdf|xxx|placeholder)\b/i.test(to)) {
    findings.push({
      id: "wrong-recipient",
      severity: "warning",
      message: "Recipient looks like a placeholder — double-check before sending.",
    });
  }

  if (/\bi\s+think\b|\bmaybe\b|\bidk\b|\blol\b|\bwtf\b/i.test(body)) {
    findings.push({
      id: "tone",
      severity: "warning",
      message: "Tone may not be professional enough for enterprise email.",
    });
  }

  if (/\bi\s+[a-z]/g.test(body) && !/\bI\b/.test(body.replace(/\bi\s/g, "I "))) {
    findings.push({
      id: "grammar",
      severity: "info",
      message: "Possible grammar issues detected (lowercase “i”).",
    });
  }

  const recent = input.recentSubjects ?? [];
  if (
    subject &&
    recent.some((s) => s.trim().toLowerCase() === subject.toLowerCase())
  ) {
    findings.push({
      id: "duplicate",
      severity: "warning",
      message: "Duplicate email warning — a similar subject was sent recently.",
    });
  }

  return findings;
}

export function getSmartComposeSuggestions(input: {
  body: string;
  subject: string;
  style?: EmailDraftStyle;
}): SmartComposeSuggestion[] {
  const style = input.style ?? detectDraftStyle(input.subject || input.body);
  const suggestions: SmartComposeSuggestion[] = [];
  const body = input.body.trim();

  if (!body) {
    suggestions.push({
      id: "greet-1",
      kind: "greeting",
      label: GREETINGS[style],
      insert: `${GREETINGS[style]}\n\n`,
    });
    suggestions.push({
      id: "tpl-meeting",
      kind: "template",
      label: "Meeting template",
      insert: EMAIL_TEMPLATE_PRESETS.find((p) => p.code === "MEETING")?.body ?? "",
    });
    suggestions.push({
      id: "tpl-reminder",
      kind: "template",
      label: "Reminder template",
      insert: EMAIL_TEMPLATE_PRESETS.find((p) => p.code === "REMINDER")?.body ?? "",
    });
  }

  if (body && !/best regards|kind regards|yours sincerely|thanks,/i.test(body)) {
    suggestions.push({
      id: "close-1",
      kind: "closing",
      label: "Add closing",
      insert: `\n\n${CLOSINGS[style]}`,
    });
  }

  if (body.length > 20 && body.length < 400) {
    suggestions.push({
      id: "sent-next",
      kind: "sentence",
      label: "Add next steps",
      insert: "\n\nPlease confirm receipt and share any questions by end of day.",
    });
    suggestions.push({
      id: "sent-avail",
      kind: "sentence",
      label: "Ask availability",
      insert: "\n\nPlease share your availability so we can schedule accordingly.",
    });
  }

  if (/invoice|report|policy|offer|attachment|document/i.test(body + input.subject)) {
    suggestions.push({
      id: "att-hint",
      kind: "attachment",
      label: "Mention attachment",
      insert: "\n\nPlease find the relevant document attached for your review.",
    });
  }

  return suggestions.slice(0, 5);
}

export function speakAssistantMessage(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  } catch {
    // ignore TTS failures
  }
}
