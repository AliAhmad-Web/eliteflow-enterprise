/**
 * Built-in Enterprise AI Agents.
 */

import {
  DEFAULT_CHAT_AGENT_ID,
  type AiAgentDefinition,
} from "./ai-agent.js";

export const CHAT_AGENT: AiAgentDefinition = Object.freeze({
  id: DEFAULT_CHAT_AGENT_ID,
  type: "chat",
  name: "Chat Agent",
  description: "Default conversational assistant for general requests.",
  systemInstructions:
    "You are the EliteFlow Chat Agent. Prefer clear, concise answers.",
  runtimeInstructions:
    "Agent: chat. Optimize for helpful dialogue without unnecessary tool use.",
  preferredTools: [],
  preferredProvider: null,
  preferredModel: null,
  memoryPreferences: Object.freeze({
    historyEnabled: true,
    maxHistoryMessages: null,
  }),
  executionHints: Object.freeze({
    streamingPreferred: true,
    maxTools: null,
    priority: 0,
  }),
  modes: Object.freeze(["ASK", "CHAT", "GENERAL"]),
  modules: null,
  surfaces: Object.freeze(["ASSISTANT"]),
  enabled: true,
});

export const ANALYSIS_AGENT: AiAgentDefinition = Object.freeze({
  id: "agent.analysis",
  type: "analysis",
  name: "Analysis Agent",
  description: "Specializes in project and report analysis.",
  systemInstructions:
    "You are the EliteFlow Analysis Agent. Emphasize structured findings and evidence.",
  runtimeInstructions:
    "Agent: analysis. Prefer analyze_project and analyze_report when eligible.",
  preferredTools: Object.freeze(["analyze_project", "analyze_report"]),
  preferredProvider: null,
  preferredModel: null,
  memoryPreferences: Object.freeze({
    historyEnabled: true,
    maxHistoryMessages: null,
  }),
  executionHints: Object.freeze({
    streamingPreferred: false,
    maxTools: 3,
    priority: 10,
  }),
  modes: Object.freeze(["ANALYZE", "PROJECT_SUMMARY"]),
  modules: Object.freeze(["projects", "reports", "ai"]),
  surfaces: Object.freeze(["ASSISTANT", "REPORTS"]),
  enabled: true,
});

export const DOCUMENT_AGENT: AiAgentDefinition = Object.freeze({
  id: "agent.document",
  type: "document",
  name: "Document Agent",
  description: "Specializes in document drafting and persistence.",
  systemInstructions:
    "You are the EliteFlow Document Agent. Focus on clear document structure.",
  runtimeInstructions:
    "Agent: document. Prefer summarize_content and save_ai_document when eligible.",
  preferredTools: Object.freeze(["summarize_content", "save_ai_document"]),
  preferredProvider: null,
  preferredModel: null,
  memoryPreferences: Object.freeze({
    historyEnabled: true,
    maxHistoryMessages: null,
  }),
  executionHints: Object.freeze({
    streamingPreferred: true,
    maxTools: 2,
    priority: 10,
  }),
  modes: Object.freeze(["DOCUMENT", "SUMMARIZE"]),
  modules: Object.freeze(["ai", "documents"]),
  surfaces: Object.freeze(["ASSISTANT", "DOCUMENTS"]),
  enabled: true,
});

export const WORKFLOW_AGENT: AiAgentDefinition = Object.freeze({
  id: "agent.workflow",
  type: "workflow",
  name: "Workflow Agent",
  description: "Specializes in tasks, meetings, and operational workflows.",
  systemInstructions:
    "You are the EliteFlow Workflow Agent. Prefer actionable next steps.",
  runtimeInstructions:
    "Agent: workflow. Prefer create_task and create_calendar_event when eligible.",
  preferredTools: Object.freeze([
    "create_task",
    "create_calendar_event",
    "draft_email",
    "lookup_client",
  ]),
  preferredProvider: null,
  preferredModel: null,
  memoryPreferences: Object.freeze({
    historyEnabled: true,
    maxHistoryMessages: null,
  }),
  executionHints: Object.freeze({
    streamingPreferred: false,
    maxTools: 4,
    priority: 10,
  }),
  modes: Object.freeze(["MEETING_NOTES", "EMAIL"]),
  modules: Object.freeze(["tasks", "calendar", "communication", "ai"]),
  surfaces: Object.freeze(["ASSISTANT", "COMMUNICATION", "WHITEBOARD"]),
  enabled: true,
});

export const BUILTIN_AGENTS: readonly AiAgentDefinition[] = Object.freeze([
  CHAT_AGENT,
  ANALYSIS_AGENT,
  DOCUMENT_AGENT,
  WORKFLOW_AGENT,
]);
