/**
 * Built-in Multi-Agent Collaboration rules.
 * Maps primary agent type → optional supporting agent type.
 */

import type { AiAgentType } from "./ai-agent.js";
import type { AiAgentCollaborationMode } from "./ai-agent-collaboration.js";

export interface AiAgentCollaborationRule {
  readonly supportingType: Exclude<AiAgentType, "custom"> | null;
  readonly mode: AiAgentCollaborationMode;
  readonly reason: string;
}

/**
 * Document → Analysis
 * Analysis → Workflow
 * Workflow → Chat
 * Chat → none
 */
export const BUILTIN_COLLABORATION_RULES: Readonly<
  Record<Exclude<AiAgentType, "custom">, AiAgentCollaborationRule>
> = Object.freeze({
  document: Object.freeze({
    supportingType: "analysis",
    mode: "sequential",
    reason: "Document primary with Analysis support for structured findings",
  }),
  analysis: Object.freeze({
    supportingType: "workflow",
    mode: "sequential",
    reason: "Analysis primary with Workflow support for actionable follow-through",
  }),
  workflow: Object.freeze({
    supportingType: "chat",
    mode: "advisory",
    reason: "Workflow primary with Chat support for clear user-facing guidance",
  }),
  chat: Object.freeze({
    supportingType: null,
    mode: "solo",
    reason: "Chat primary operates alone for conversational replies",
  }),
});
