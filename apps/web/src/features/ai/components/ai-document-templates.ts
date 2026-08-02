import type { AiDocumentTypeValue } from "@enterprise/shared";

/**
 * Client-side document templates (ported from mobile DOCUMENT_TEMPLATES).
 * Prefill only — no server template model.
 */
export interface AiDocumentTemplate {
  id: string;
  type: AiDocumentTypeValue;
  title: string;
  description: string;
  defaultPrompt: string;
  /** Optional markdown starter for manual-create mode. */
  defaultContent: string;
}

export const AI_DOCUMENT_TEMPLATES: readonly AiDocumentTemplate[] = [
  {
    id: "proposal",
    type: "PROPOSAL",
    title: "Proposal Generator",
    description: "Client-ready proposal outline",
    defaultPrompt:
      "Generate a concise project proposal with scope, timeline, and investment summary for:",
    defaultContent:
      "# Project Proposal\n\n## Scope\n\n## Timeline\n\n## Investment\n\n",
  },
  {
    id: "meeting-notes",
    type: "MEETING_NOTES",
    title: "Meeting Notes",
    description: "Structured notes + action items",
    defaultPrompt:
      "Draft structured meeting notes with decisions and action items from:",
    defaultContent:
      "# Meeting Notes\n\n## Attendees\n\n## Decisions\n\n## Action items\n\n",
  },
  {
    id: "technical-docs",
    type: "TECHNICAL_DOCS",
    title: "Technical Documentation",
    description: "Architecture and implementation notes",
    defaultPrompt:
      "Write technical documentation covering architecture, APIs, and setup for:",
    defaultContent:
      "# Technical Documentation\n\n## Overview\n\n## Architecture\n\n## Setup\n\n",
  },
  {
    id: "project-summary",
    type: "PROJECT_SUMMARY",
    title: "Project Summary",
    description: "Status, risks, and next steps",
    defaultPrompt:
      "Summarize project status, risks, blockers, and recommended next steps for:",
    defaultContent:
      "# Project Summary\n\n## Status\n\n## Risks\n\n## Next steps\n\n",
  },
  {
    id: "task-summary",
    type: "GENERAL",
    title: "Task Summary",
    description: "Priority and overdue task digest",
    defaultPrompt:
      "Summarize overdue and high-priority tasks with owners and suggested focus for today:",
    defaultContent:
      "# Task Summary\n\n## Priorities\n\n## Overdue\n\n## Focus today\n\n",
  },
  {
    id: "email",
    type: "EMAIL",
    title: "Email Generator",
    description: "Professional client email draft",
    defaultPrompt:
      "Draft a professional client email about project progress covering:",
    defaultContent:
      "# Email Draft\n\n**Subject:**\n\nHi,\n\n\n\nBest regards,\n",
  },
] as const;
