/**
 * Business Query entities — what the user is asking about.
 * Metadata only; never loads records.
 */

export const AI_BUSINESS_QUERY_ENTITIES = Object.freeze([
  "task",
  "project",
  "invoice",
  "employee",
  "meeting",
  "document",
  "report",
  "customer",
  "lead",
  "finance",
  "calendar",
  "notification",
  "file",
] as const);

export type AiBusinessQueryEntity =
  (typeof AI_BUSINESS_QUERY_ENTITIES)[number];

export function isAiBusinessQueryEntity(
  value: string,
): value is AiBusinessQueryEntity {
  return (AI_BUSINESS_QUERY_ENTITIES as readonly string[]).includes(value);
}

export function formatBusinessQueryEntity(
  entity: AiBusinessQueryEntity,
): string {
  switch (entity) {
    case "task":
      return "Task";
    case "project":
      return "Project";
    case "invoice":
      return "Invoice";
    case "employee":
      return "Employee";
    case "meeting":
      return "Meeting";
    case "document":
      return "Document";
    case "report":
      return "Report";
    case "customer":
      return "Customer";
    case "lead":
      return "Lead";
    case "finance":
      return "Finance";
    case "calendar":
      return "Calendar";
    case "notification":
      return "Notification";
    case "file":
      return "File";
    default: {
      const _exhaustive: never = entity;
      return _exhaustive;
    }
  }
}

/** Map entity → enterprise module id (metadata only). */
export function moduleIdForEntity(
  entity: AiBusinessQueryEntity,
): string {
  switch (entity) {
    case "task":
      return "module.tasks";
    case "project":
      return "module.projects";
    case "invoice":
    case "finance":
      return "module.finance";
    case "employee":
      return "module.hrm";
    case "meeting":
    case "calendar":
      return "module.calendar";
    case "document":
      return "module.documents";
    case "report":
      return "module.reports";
    case "customer":
    case "lead":
      return "module.crm";
    case "notification":
      return "module.notifications";
    case "file":
      return "module.storage";
    default: {
      const _exhaustive: never = entity;
      return _exhaustive;
    }
  }
}

export function moduleNameForEntity(
  entity: AiBusinessQueryEntity,
): string {
  switch (entity) {
    case "task":
      return "Tasks";
    case "project":
      return "Projects";
    case "invoice":
    case "finance":
      return "Finance";
    case "employee":
      return "HRM";
    case "meeting":
    case "calendar":
      return "Calendar";
    case "document":
      return "Documents";
    case "report":
      return "Reports";
    case "customer":
    case "lead":
      return "CRM";
    case "notification":
      return "Notifications";
    case "file":
      return "Storage";
    default: {
      const _exhaustive: never = entity;
      return _exhaustive;
    }
  }
}
