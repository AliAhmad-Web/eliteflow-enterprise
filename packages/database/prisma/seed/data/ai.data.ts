import {
  AiAssistMode,
  AiDocumentType,
  AiMessageRole,
} from "../../../src/generated/client";

export interface AiConversationSeedRecord {
  ownerEmail: string;
  title: string;
  messages: Array<{
    role: AiMessageRole;
    content: string;
    mode?: AiAssistMode;
  }>;
}

export interface AiDocumentSeedRecord {
  ownerEmail: string;
  title: string;
  type: AiDocumentType;
  prompt: string;
  content: string;
}

export const AI_CONVERSATION_SEED_DATA: readonly AiConversationSeedRecord[] = [
  {
    ownerEmail: "admin@eliteflow.dev",
    title: "Draft client follow-up email",
    messages: [
      {
        role: AiMessageRole.USER,
        content: "Write a follow-up email after the Acme portal kickoff.",
        mode: AiAssistMode.EMAIL,
      },
      {
        role: AiMessageRole.ASSISTANT,
        content:
          "## Email draft\n\n**Subject:** Great kickoff — next steps for Acme Portal\n\nHi Jane,\n\nThank you for a productive kickoff. We aligned on discovery milestones and will share the wireframe package by Friday.\n\nBest regards,\nEliteFlow Team",
        mode: AiAssistMode.EMAIL,
      },
    ],
  },
  {
    ownerEmail: "employee@eliteflow.dev",
    title: "Task prioritization tips",
    messages: [
      {
        role: AiMessageRole.USER,
        content: "How should I prioritize my assigned portal tasks?",
        mode: AiAssistMode.ASK,
      },
      {
        role: AiMessageRole.ASSISTANT,
        content:
          "## Answer\n\n1. Clear blockers first\n2. Finish in-progress work before starting new tasks\n3. Align due dates with project milestones\n4. Flag risks early in comments",
        mode: AiAssistMode.ASK,
      },
    ],
  },
  {
    ownerEmail: "client@eliteflow.dev",
    title: "Project status summary request",
    messages: [
      {
        role: AiMessageRole.USER,
        content: "Summarize the current status of my portal redesign project.",
        mode: AiAssistMode.PROJECT_SUMMARY,
      },
      {
        role: AiMessageRole.ASSISTANT,
        content:
          "## Project summary\n\n- Discovery complete\n- UI prototypes in progress\n- Next milestone: stakeholder review\n- No critical blockers reported",
        mode: AiAssistMode.PROJECT_SUMMARY,
      },
    ],
  },
];

export const AI_DOCUMENT_SEED_DATA: readonly AiDocumentSeedRecord[] = [
  {
    ownerEmail: "admin@eliteflow.dev",
    title: "Acme Portal Proposal",
    type: AiDocumentType.PROPOSAL,
    prompt: "Create a proposal for Acme portal redesign phase 2",
    content:
      "## Business proposal\n\n### Overview\nPhase 2 delivers billing self-serve and refined navigation.\n\n### Timeline\n8 weeks including QA and launch support.",
  },
  {
    ownerEmail: "employee@eliteflow.dev",
    title: "Sprint Retro Meeting Notes",
    type: AiDocumentType.MEETING_NOTES,
    prompt: "Meeting notes for sprint retrospective",
    content:
      "## Meeting notes\n\n### Decisions\n- Improve estimation accuracy\n\n### Action items\n- [ ] Add clearer acceptance criteria on tasks",
  },
  {
    ownerEmail: "client@eliteflow.dev",
    title: "Portal Status Summary",
    type: AiDocumentType.PROJECT_SUMMARY,
    prompt: "Summarize my portal project for leadership",
    content:
      "## Project summary\n\nProgress is healthy. Design review is next, followed by implementation of billing flows.",
  },
];
