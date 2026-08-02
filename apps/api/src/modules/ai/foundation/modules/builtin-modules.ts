/**
 * Built-in Enterprise Module metadata placeholders.
 * Metadata only — no functionality, no database access.
 */

import type { AiEnterpriseModuleDefinition } from "./module-definition.js";

export const CRM_MODULE: AiEnterpriseModuleDefinition = Object.freeze({
  id: "module.crm",
  name: "CRM",
  description: "Clients, contacts, and relationship management.",
  supportedActions: Object.freeze(["lookup", "summarize", "list"]),
  supportedEntities: Object.freeze(["client", "contact", "company"]),
  supportedQueries: Object.freeze([
    "client profile",
    "recent interactions",
    "client search",
  ]),
  permissions: Object.freeze(["clients:read"]),
  priority: 80,
  availability: "available",
  moduleKeys: Object.freeze(["clients", "crm", "communication"]),
  surfaces: Object.freeze(["ASSISTANT", "COMMUNICATION"]),
  preferredAgentTypes: Object.freeze(["chat", "workflow", "analysis"]),
  enabled: true,
});

export const PROJECTS_MODULE: AiEnterpriseModuleDefinition = Object.freeze({
  id: "module.projects",
  name: "Projects",
  description: "Project tracking, milestones, and delivery status.",
  supportedActions: Object.freeze(["analyze", "summarize", "status"]),
  supportedEntities: Object.freeze(["project", "milestone"]),
  supportedQueries: Object.freeze([
    "project status",
    "project summary",
    "milestone progress",
  ]),
  permissions: Object.freeze(["projects:read"]),
  priority: 85,
  availability: "available",
  moduleKeys: Object.freeze(["projects", "ai"]),
  surfaces: Object.freeze(["ASSISTANT", "REPORTS"]),
  preferredAgentTypes: Object.freeze(["analysis", "workflow"]),
  enabled: true,
});

export const TASKS_MODULE: AiEnterpriseModuleDefinition = Object.freeze({
  id: "module.tasks",
  name: "Tasks",
  description: "Task planning, assignment, and operational follow-ups.",
  supportedActions: Object.freeze(["create", "list", "assign", "plan"]),
  supportedEntities: Object.freeze(["task"]),
  supportedQueries: Object.freeze(["open tasks", "task backlog", "assignees"]),
  permissions: Object.freeze(["tasks:read", "tasks:write"]),
  priority: 75,
  availability: "available",
  moduleKeys: Object.freeze(["tasks", "projects", "ai"]),
  surfaces: Object.freeze(["ASSISTANT", "WHITEBOARD", "COMMUNICATION"]),
  preferredAgentTypes: Object.freeze(["workflow", "chat"]),
  enabled: true,
});

export const HRM_MODULE: AiEnterpriseModuleDefinition = Object.freeze({
  id: "module.hrm",
  name: "HRM",
  description: "Human resources, people, and workforce metadata.",
  supportedActions: Object.freeze(["lookup", "summarize"]),
  supportedEntities: Object.freeze(["employee", "team"]),
  supportedQueries: Object.freeze(["team roster", "employee directory"]),
  permissions: Object.freeze(["hr:read"]),
  priority: 55,
  availability: "limited",
  moduleKeys: Object.freeze(["hr", "hrm", "people"]),
  surfaces: Object.freeze(["ASSISTANT"]),
  preferredAgentTypes: Object.freeze(["chat", "workflow"]),
  enabled: true,
});

export const FINANCE_MODULE: AiEnterpriseModuleDefinition = Object.freeze({
  id: "module.finance",
  name: "Finance",
  description: "Financial summaries and reporting context.",
  supportedActions: Object.freeze(["summarize", "analyze"]),
  supportedEntities: Object.freeze(["invoice", "payment", "budget"]),
  supportedQueries: Object.freeze([
    "invoice summary",
    "payment status",
    "budget overview",
  ]),
  permissions: Object.freeze(["finance:read"]),
  priority: 70,
  availability: "limited",
  moduleKeys: Object.freeze(["finance", "billing"]),
  surfaces: Object.freeze(["ASSISTANT", "REPORTS"]),
  preferredAgentTypes: Object.freeze(["analysis"]),
  enabled: true,
});

export const CALENDAR_MODULE: AiEnterpriseModuleDefinition = Object.freeze({
  id: "module.calendar",
  name: "Calendar",
  description: "Meetings, events, and scheduling context.",
  supportedActions: Object.freeze(["schedule", "list", "summarize"]),
  supportedEntities: Object.freeze(["calendar", "event", "meeting"]),
  supportedQueries: Object.freeze(["upcoming meetings", "availability"]),
  permissions: Object.freeze(["calendar:read", "calendar:write"]),
  priority: 72,
  availability: "available",
  moduleKeys: Object.freeze(["calendar", "communication", "ai"]),
  surfaces: Object.freeze(["ASSISTANT", "COMMUNICATION"]),
  preferredAgentTypes: Object.freeze(["workflow", "chat"]),
  enabled: true,
});

export const DOCUMENTS_MODULE: AiEnterpriseModuleDefinition = Object.freeze({
  id: "module.documents",
  name: "Documents",
  description: "Document drafting, storage references, and summaries.",
  supportedActions: Object.freeze(["draft", "summarize", "organize"]),
  supportedEntities: Object.freeze(["document"]),
  supportedQueries: Object.freeze(["document summary", "recent documents"]),
  permissions: Object.freeze(["documents:read", "ai:use"]),
  priority: 78,
  availability: "available",
  moduleKeys: Object.freeze(["documents", "ai"]),
  surfaces: Object.freeze(["ASSISTANT", "DOCUMENTS"]),
  preferredAgentTypes: Object.freeze(["document", "chat"]),
  enabled: true,
});

export const REPORTS_MODULE: AiEnterpriseModuleDefinition = Object.freeze({
  id: "module.reports",
  name: "Reports",
  description: "Operational and analytical report context.",
  supportedActions: Object.freeze(["analyze", "summarize", "compare"]),
  supportedEntities: Object.freeze(["report"]),
  supportedQueries: Object.freeze(["report summary", "report trends"]),
  permissions: Object.freeze(["reports:read"]),
  priority: 82,
  availability: "available",
  moduleKeys: Object.freeze(["reports", "ai", "projects"]),
  surfaces: Object.freeze(["ASSISTANT", "REPORTS"]),
  preferredAgentTypes: Object.freeze(["analysis"]),
  enabled: true,
});

export const NOTIFICATIONS_MODULE: AiEnterpriseModuleDefinition = Object.freeze({
  id: "module.notifications",
  name: "Notifications",
  description: "Notification preferences and delivery metadata.",
  supportedActions: Object.freeze(["notify", "list"]),
  supportedEntities: Object.freeze(["notification"]),
  supportedQueries: Object.freeze(["unread notifications"]),
  permissions: Object.freeze(["notifications:read"]),
  priority: 40,
  availability: "available",
  moduleKeys: Object.freeze(["notifications", "ai"]),
  surfaces: Object.freeze(["ASSISTANT"]),
  preferredAgentTypes: Object.freeze(["workflow", "chat"]),
  enabled: true,
});

export const SETTINGS_MODULE: AiEnterpriseModuleDefinition = Object.freeze({
  id: "module.settings",
  name: "Settings",
  description: "Organization and user settings metadata.",
  supportedActions: Object.freeze(["lookup"]),
  supportedEntities: Object.freeze(["setting", "preference"]),
  supportedQueries: Object.freeze(["preference summary"]),
  permissions: Object.freeze(["settings:read"]),
  priority: 30,
  availability: "available",
  moduleKeys: Object.freeze(["settings"]),
  surfaces: Object.freeze(["ASSISTANT"]),
  preferredAgentTypes: Object.freeze(["chat"]),
  enabled: true,
});

export const STORAGE_MODULE: AiEnterpriseModuleDefinition = Object.freeze({
  id: "module.storage",
  name: "Storage",
  description: "File storage references and attachment metadata.",
  supportedActions: Object.freeze(["lookup", "list"]),
  supportedEntities: Object.freeze(["file", "attachment"]),
  supportedQueries: Object.freeze(["recent files"]),
  permissions: Object.freeze(["storage:read"]),
  priority: 35,
  availability: "limited",
  moduleKeys: Object.freeze(["storage", "documents", "ai"]),
  surfaces: Object.freeze(["ASSISTANT", "DOCUMENTS"]),
  preferredAgentTypes: Object.freeze(["document", "chat"]),
  enabled: true,
});

export const BUILTIN_ENTERPRISE_MODULES: readonly AiEnterpriseModuleDefinition[] =
  Object.freeze([
    CRM_MODULE,
    PROJECTS_MODULE,
    TASKS_MODULE,
    HRM_MODULE,
    FINANCE_MODULE,
    CALENDAR_MODULE,
    DOCUMENTS_MODULE,
    REPORTS_MODULE,
    NOTIFICATIONS_MODULE,
    SETTINGS_MODULE,
    STORAGE_MODULE,
  ]);
