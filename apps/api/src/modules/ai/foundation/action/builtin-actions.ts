/**
 * Built-in Enterprise AI Action metadata placeholders.
 * Metadata only — no execution, no service calls.
 */

import type { AiActionDefinition } from "./action-definition.js";
import { DEFAULT_GENERIC_ACTION_ID } from "./ai-action.js";

export const TASK_ACTION: AiActionDefinition = Object.freeze({
  id: "action.task",
  category: "task",
  name: "Task Action",
  description: "Task planning, assignment, and operational follow-ups.",
  capabilities: Object.freeze(["create", "list", "assign", "plan", "update"]),
  supportedEntities: Object.freeze(["task"]),
  supportedIntents: Object.freeze(["list", "status", "open", "details"]),
  moduleKeys: Object.freeze(["tasks", "projects", "ai"]),
  preferredAgentTypes: Object.freeze(["workflow", "chat"]),
  surfaces: Object.freeze(["ASSISTANT", "WHITEBOARD", "COMMUNICATION"]),
  priority: 75,
  enabled: true,
});

export const PROJECT_ACTION: AiActionDefinition = Object.freeze({
  id: "action.project",
  category: "project",
  name: "Project Action",
  description: "Project tracking, milestones, and delivery status.",
  capabilities: Object.freeze(["analyze", "summarize", "status"]),
  supportedEntities: Object.freeze(["project", "milestone"]),
  supportedIntents: Object.freeze([
    "status",
    "progress",
    "summary",
    "analytics",
  ]),
  moduleKeys: Object.freeze(["projects", "ai"]),
  preferredAgentTypes: Object.freeze(["analysis", "workflow"]),
  surfaces: Object.freeze(["ASSISTANT", "REPORTS"]),
  priority: 85,
  enabled: true,
});

export const CRM_ACTION: AiActionDefinition = Object.freeze({
  id: "action.crm",
  category: "crm",
  name: "CRM Action",
  description: "Clients, contacts, and relationship management.",
  capabilities: Object.freeze(["lookup", "summarize", "list"]),
  supportedEntities: Object.freeze(["client", "contact", "company"]),
  supportedIntents: Object.freeze(["search", "summary", "list", "details"]),
  moduleKeys: Object.freeze(["clients", "crm", "communication"]),
  preferredAgentTypes: Object.freeze(["chat", "workflow", "analysis"]),
  surfaces: Object.freeze(["ASSISTANT", "COMMUNICATION"]),
  priority: 80,
  enabled: true,
});

export const CALENDAR_ACTION: AiActionDefinition = Object.freeze({
  id: "action.calendar",
  category: "calendar",
  name: "Calendar Action",
  description: "Meetings, events, and scheduling context.",
  capabilities: Object.freeze(["schedule", "list", "summarize"]),
  supportedEntities: Object.freeze(["calendar", "event", "meeting"]),
  supportedIntents: Object.freeze(["list", "status", "open"]),
  moduleKeys: Object.freeze(["calendar", "communication", "ai"]),
  preferredAgentTypes: Object.freeze(["workflow", "chat"]),
  surfaces: Object.freeze(["ASSISTANT", "COMMUNICATION"]),
  priority: 72,
  enabled: true,
});

export const DOCUMENT_ACTION: AiActionDefinition = Object.freeze({
  id: "action.document",
  category: "document",
  name: "Document Action",
  description: "Document drafting, storage references, and summaries.",
  capabilities: Object.freeze(["draft", "summarize", "organize"]),
  supportedEntities: Object.freeze(["document"]),
  supportedIntents: Object.freeze(["summary", "review", "details", "open"]),
  moduleKeys: Object.freeze(["documents", "ai"]),
  preferredAgentTypes: Object.freeze(["document", "chat"]),
  surfaces: Object.freeze(["ASSISTANT", "DOCUMENTS"]),
  priority: 78,
  enabled: true,
});

export const REPORT_ACTION: AiActionDefinition = Object.freeze({
  id: "action.report",
  category: "report",
  name: "Report Action",
  description: "Operational and analytical report context.",
  capabilities: Object.freeze(["analyze", "summarize", "compare"]),
  supportedEntities: Object.freeze(["report"]),
  supportedIntents: Object.freeze([
    "analytics",
    "insights",
    "summary",
    "compare",
  ]),
  moduleKeys: Object.freeze(["reports", "ai", "projects"]),
  preferredAgentTypes: Object.freeze(["analysis"]),
  surfaces: Object.freeze(["ASSISTANT", "REPORTS"]),
  priority: 82,
  enabled: true,
});

export const EMAIL_ACTION: AiActionDefinition = Object.freeze({
  id: "action.email",
  category: "email",
  name: "Email Action",
  description: "Email drafting and communication metadata.",
  capabilities: Object.freeze(["draft", "summarize", "list"]),
  supportedEntities: Object.freeze(["email", "message"]),
  supportedIntents: Object.freeze(["list", "summary", "open", "review"]),
  moduleKeys: Object.freeze(["communication", "crm", "clients"]),
  preferredAgentTypes: Object.freeze(["chat", "workflow"]),
  surfaces: Object.freeze(["ASSISTANT", "COMMUNICATION"]),
  priority: 68,
  enabled: true,
});

export const WORKFLOW_ACTION: AiActionDefinition = Object.freeze({
  id: "action.workflow",
  category: "workflow",
  name: "Workflow Action",
  description: "Multi-step operational workflow planning metadata.",
  capabilities: Object.freeze(["plan", "orchestrate", "status"]),
  supportedEntities: Object.freeze(["workflow", "process"]),
  supportedIntents: Object.freeze([
    "status",
    "progress",
    "recommendation",
    "details",
  ]),
  moduleKeys: Object.freeze(["ai", "projects", "tasks"]),
  preferredAgentTypes: Object.freeze(["workflow"]),
  surfaces: Object.freeze(["ASSISTANT", "WHITEBOARD"]),
  priority: 88,
  enabled: true,
});

export const NOTIFICATION_ACTION: AiActionDefinition = Object.freeze({
  id: "action.notification",
  category: "notification",
  name: "Notification Action",
  description: "Notification preferences and delivery metadata.",
  capabilities: Object.freeze(["notify", "list"]),
  supportedEntities: Object.freeze(["notification"]),
  supportedIntents: Object.freeze(["list", "open", "status"]),
  moduleKeys: Object.freeze(["notifications", "ai"]),
  preferredAgentTypes: Object.freeze(["workflow", "chat"]),
  surfaces: Object.freeze(["ASSISTANT"]),
  priority: 40,
  enabled: true,
});

export const STORAGE_ACTION: AiActionDefinition = Object.freeze({
  id: "action.storage",
  category: "storage",
  name: "Storage Action",
  description: "File storage references and attachment metadata.",
  capabilities: Object.freeze(["lookup", "list"]),
  supportedEntities: Object.freeze(["file", "attachment"]),
  supportedIntents: Object.freeze(["list", "search", "open"]),
  moduleKeys: Object.freeze(["storage", "documents", "ai"]),
  preferredAgentTypes: Object.freeze(["document", "chat"]),
  surfaces: Object.freeze(["ASSISTANT", "DOCUMENTS"]),
  priority: 35,
  enabled: true,
});

export const SETTINGS_ACTION: AiActionDefinition = Object.freeze({
  id: "action.settings",
  category: "settings",
  name: "Settings Action",
  description: "Organization and user settings metadata.",
  capabilities: Object.freeze(["lookup"]),
  supportedEntities: Object.freeze(["setting", "preference"]),
  supportedIntents: Object.freeze(["summary", "details"]),
  moduleKeys: Object.freeze(["settings"]),
  preferredAgentTypes: Object.freeze(["chat"]),
  surfaces: Object.freeze(["ASSISTANT"]),
  priority: 30,
  enabled: true,
});

/**
 * Fallback Generic Action — used when no specialized action matches.
 */
export const GENERIC_ACTION: AiActionDefinition = Object.freeze({
  id: DEFAULT_GENERIC_ACTION_ID,
  category: "generic",
  name: "Generic Action",
  description: "Default fallback action for general assistant requests.",
  capabilities: Object.freeze(["assist", "clarify"]),
  supportedEntities: Object.freeze([]),
  supportedIntents: Object.freeze(["summary", "details"]),
  moduleKeys: null,
  preferredAgentTypes: Object.freeze(["chat"]),
  surfaces: Object.freeze(["ASSISTANT"]),
  priority: 0,
  enabled: true,
});

export const BUILTIN_ACTIONS: readonly AiActionDefinition[] = Object.freeze([
  TASK_ACTION,
  PROJECT_ACTION,
  CRM_ACTION,
  CALENDAR_ACTION,
  DOCUMENT_ACTION,
  REPORT_ACTION,
  EMAIL_ACTION,
  WORKFLOW_ACTION,
  NOTIFICATION_ACTION,
  STORAGE_ACTION,
  SETTINGS_ACTION,
  GENERIC_ACTION,
]);
