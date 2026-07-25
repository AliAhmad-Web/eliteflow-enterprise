import type { AiAssistModeValue, AiDocumentTypeValue } from "@enterprise/shared";

import type {
  AiGenerateParams,
  AiGenerateResult,
  AiProvider,
  AiStreamHandlers,
} from "./ai-provider.js";

const MODE_LABELS: Record<AiAssistModeValue, string> = {
  ASK: "Answer",
  EMAIL: "Email draft",
  PROPOSAL: "Business proposal",
  SUMMARIZE: "Summary",
  ANALYZE: "Analysis",
  IMPROVE: "Improvement suggestions",
  MEETING_NOTES: "Meeting notes",
  PROJECT_SUMMARY: "Project summary",
  TECHNICAL_DOCS: "Technical documentation",
};

const MOCK_FOOTER =
  "_Mock AI — set `OPENAI_API_KEY` (with billing) for live OpenAI responses._";

function extractName(text: string): string | null {
  const patterns = [
    /\b(?:my name is|i am|i'm|this is)\s+([A-Z][a-zA-Z'-]{1,30})\b/i,
    /\b(?:call me)\s+([A-Z][a-zA-Z'-]{1,30})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function rememberNameFromHistory(
  history: AiGenerateParams["history"],
  prompt: string,
): string | null {
  const fromPrompt = extractName(prompt);
  if (fromPrompt) return fromPrompt;

  for (const message of [...(history ?? [])].reverse()) {
    if (message.role !== "USER") continue;
    const found = extractName(message.content);
    if (found) return found;
  }
  return null;
}

function isGreeting(text: string): boolean {
  return /^(hi|hello|hey|hola|salam|assalam|good\s+(morning|afternoon|evening))\b/i.test(
    text.trim(),
  );
}

function isThanks(text: string): boolean {
  return /^(thanks|thank you|thx|appreciate it)\b/i.test(text.trim());
}

export class MockAiProvider implements AiProvider {
  readonly name = "mock";

  async generate(params: AiGenerateParams): Promise<AiGenerateResult> {
    await new Promise((resolve) => setTimeout(resolve, 280));
    return {
      provider: this.name,
      content: this.buildContent(params),
    };
  }

  async generateStream(
    params: AiGenerateParams,
    handlers?: AiStreamHandlers,
  ): Promise<AiGenerateResult> {
    const content = this.buildContent(params);
    const chunks = content.match(/\S+\s*/g) ?? [content];

    for (const chunk of chunks) {
      await handlers?.onDelta?.(chunk);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    return { provider: this.name, content };
  }

  private buildContent(params: AiGenerateParams): string {
    if (params.mode === "DOCUMENT" && params.documentType) {
      return this.buildDocument(params.documentType, params.prompt, params);
    }

    const mode = (
      params.mode === "DOCUMENT" ? "ASK" : params.mode
    ) as AiAssistModeValue;
    return this.buildChat(mode, params);
  }

  private buildChat(mode: AiAssistModeValue, params: AiGenerateParams): string {
    const label = MODE_LABELS[mode];
    const prompt = params.prompt.trim();
    const trimmed = prompt.slice(0, 280);
    const knownName = rememberNameFromHistory(params.history, prompt);
    const priorTurns = params.history?.length ?? 0;

    switch (mode) {
      case "EMAIL":
        return [
          `## ${label}`,
          "",
          "**Subject:** Follow-up regarding your request",
          "",
          knownName ? `Hi ${knownName},` : "Hi there,",
          "",
          `Thanks for your note about “${trimmed}”. Here is a ready-to-send draft:`,
          "",
          "I wanted to share a concise update and proposed next steps. Happy to adjust timeline, scope, or deliverables if needed.",
          "",
          "Best regards,  ",
          "EliteFlow Team",
          "",
          "---",
          MOCK_FOOTER,
        ].join("\n");

      case "PROPOSAL":
        return [
          `## ${label}`,
          "",
          "### Executive Overview",
          `This proposal addresses: **${trimmed || "your stated objectives"}**.`,
          "",
          "### Scope",
          "- Discovery and requirements alignment",
          "- Solution design and delivery milestones",
          "- Quality assurance and handoff",
          "",
          "### Timeline",
          "| Phase | Duration |",
          "| --- | --- |",
          "| Discovery | 1–2 weeks |",
          "| Build | 3–6 weeks |",
          "| Launch | 1 week |",
          "",
          "### Investment",
          "Pricing can be tailored after a short discovery workshop.",
          "",
          "```ts",
          "const nextStep = 'scheduleDiscoveryCall';",
          "```",
          "",
          MOCK_FOOTER,
        ].join("\n");

      case "SUMMARIZE":
        return [
          `## ${label}`,
          "",
          "**Key points**",
          `1. Input focuses on: ${trimmed || "the provided content"}.`,
          "2. Primary outcome requested is a concise, actionable summary.",
          "3. Recommended follow-up: confirm owners, dates, and success metrics.",
          "",
          MOCK_FOOTER,
        ].join("\n");

      case "ANALYZE":
        return [
          `## ${label}`,
          "",
          "### Findings",
          `- Signal: “${trimmed || "report input"}”`,
          "- Strength: clear intent and measurable opportunity",
          "- Risk: incomplete context may hide edge cases",
          "",
          "### Recommendation",
          "Prioritize the highest-impact actions first, then validate with stakeholders.",
          "",
          MOCK_FOOTER,
        ].join("\n");

      case "IMPROVE":
        return [
          `## ${label}`,
          "",
          "1. Clarify the desired outcome in one sentence.",
          "2. Break work into smaller deliverables with owners.",
          "3. Add measurable success criteria.",
          "4. Schedule a short review checkpoint.",
          "",
          `Context considered: ${trimmed || "general process improvements"}.`,
          "",
          MOCK_FOOTER,
        ].join("\n");

      case "MEETING_NOTES":
        return [
          `## ${label}`,
          "",
          `**Attendees:** ${knownName ? `${knownName}, (add others)` : "(add names)"}`,
          "",
          "### Discussion",
          `- Topic: ${trimmed || "meeting agenda"}`,
          "",
          "### Decisions",
          "- Align on next milestone and owners",
          "",
          "### Action items",
          "- [ ] Capture follow-ups in EliteFlow Tasks",
          "- [ ] Share notes with stakeholders",
          "",
          MOCK_FOOTER,
        ].join("\n");

      case "PROJECT_SUMMARY":
        return [
          `## ${label}`,
          "",
          `**Project focus:** ${trimmed || "delivery status"}`,
          "",
          "- Status: On track (mock)",
          "- Risks: None critical identified",
          "- Next milestone: Review progress and unblock dependencies",
          "",
          MOCK_FOOTER,
        ].join("\n");

      case "TECHNICAL_DOCS":
        return [
          `## ${label}`,
          "",
          "### Overview",
          `Documentation draft for: ${trimmed || "the requested component"}.`,
          "",
          "### Usage",
          "```bash",
          "npm run api:dev",
          "npm run web:dev",
          "```",
          "",
          "### Notes",
          "This is a mock technical outline. Connect OpenAI for production-grade docs.",
          "",
          MOCK_FOOTER,
        ].join("\n");

      case "ASK":
        return this.buildAskReply({
          prompt,
          trimmed,
          knownName,
          priorTurns,
        });

      default: {
        const _exhaustive: never = mode;
        return _exhaustive;
      }
    }
  }

  private buildAskReply(args: {
    prompt: string;
    trimmed: string;
    knownName: string | null;
    priorTurns: number;
  }): string {
    const { prompt, trimmed, knownName, priorTurns } = args;
    const lower = prompt.toLowerCase();
    const introducedNow = Boolean(extractName(prompt));

    if (isGreeting(prompt) || introducedNow) {
      const name = knownName ?? "there";
      const greeting = introducedNow
        ? `Nice to meet you, **${name}**.`
        : knownName
          ? `Hi ${knownName} — good to see you again.`
          : "Hi — good to meet you.";

      return [
        greeting,
        "",
        "I'm EliteFlow's assistant (currently running in **Mock** mode).",
        "I can help with emails, proposals, meeting notes, project summaries, and day-to-day ERP questions.",
        "",
        "What would you like to work on?",
        "",
        MOCK_FOOTER,
      ].join("\n");
    }

    if (isThanks(prompt)) {
      return [
        knownName ? `You're welcome, ${knownName}.` : "You're welcome.",
        "",
        "If you want, I can draft an email, summarize a project, or outline next tasks next.",
        "",
        MOCK_FOOTER,
      ].join("\n");
    }

    if (
      /\b(who am i|what(?:'s| is) my name|do you remember (me|my name))\b/i.test(
        prompt,
      )
    ) {
      return [
        knownName
          ? `Yes — you told me your name is **${knownName}**.`
          : "I don't have your name yet. Tell me what to call you and I'll remember it in this conversation.",
        "",
        MOCK_FOOTER,
      ].join("\n");
    }

    if (/\b(help|what can you do|capabilities)\b/i.test(lower)) {
      return [
        knownName ? `Happy to help, ${knownName}.` : "Happy to help.",
        "",
        "In Ask mode I can:",
        "- Answer product / workflow questions",
        "- Suggest how to use Clients, Projects, Tasks, and Invoices",
        "- Switch into Email / Proposal / Summarize modes for deliverables",
        "",
        `Try something like: “Draft a follow-up email to Acme” or “Summarize portal redesign status.”`,
        "",
        MOCK_FOOTER,
      ].join("\n");
    }

    return [
      knownName ? `Got it, ${knownName}.` : "Got it.",
      "",
      priorTurns > 0
        ? "Based on this conversation so far, here's a practical next step:"
        : "Here's a practical next step:",
      "",
      `You asked about: **${trimmed || "your request"}**`,
      "",
      "- Clarify the goal in one sentence",
      "- Note constraints (deadline, budget, owners)",
      "- Capture the work in Projects/Tasks so it stays auditable",
      "",
      "If you want a finished artifact, switch mode to **Email**, **Proposal**, or open **AI Documents**.",
      "",
      MOCK_FOOTER,
    ].join("\n");
  }

  private buildDocument(
    type: AiDocumentTypeValue,
    prompt: string,
    params: AiGenerateParams,
  ): string {
    const modeMap: Record<AiDocumentTypeValue, AiAssistModeValue> = {
      PROPOSAL: "PROPOSAL",
      EMAIL: "EMAIL",
      MEETING_NOTES: "MEETING_NOTES",
      PROJECT_SUMMARY: "PROJECT_SUMMARY",
      TECHNICAL_DOCS: "TECHNICAL_DOCS",
      GENERAL: "ASK",
    };
    return this.buildChat(modeMap[type], { ...params, prompt, mode: modeMap[type] });
  }
}
