/**
 * Placeholder Module Data Providers.
 * Return empty safe responses — no service/database access.
 */

import type { AiModuleDataProvider } from "./module-data-provider.js";
import { createModuleDataProvider } from "./create-module-data-provider.js";
import { emptyResponse } from "./module-data-helpers.js";
import { MODULE_READ_PERMISSIONS } from "./module-data-helpers.js";

function createPlaceholder(input: {
  readonly moduleId: string;
  readonly name: string;
  readonly permission: string | null;
  readonly capabilities: readonly string[];
}): AiModuleDataProvider {
  return createModuleDataProvider({
    ...input,
    async fetchSummaries() {
      return emptyResponse(input.moduleId, input.name, "empty", "placeholder");
    },
  });
}

export const PLACEHOLDER_MODULE_DATA_PROVIDERS: readonly AiModuleDataProvider[] =
  Object.freeze([
    createPlaceholder({
      moduleId: "module.crm",
      name: "CRM",
      permission: MODULE_READ_PERMISSIONS.crm,
      capabilities: Object.freeze(["summary", "count", "clients"]),
    }),
    createPlaceholder({
      moduleId: "module.projects",
      name: "Projects",
      permission: MODULE_READ_PERMISSIONS.projects,
      capabilities: Object.freeze(["summary", "count", "projects"]),
    }),
    createPlaceholder({
      moduleId: "module.tasks",
      name: "Tasks",
      permission: MODULE_READ_PERMISSIONS.tasks,
      capabilities: Object.freeze(["summary", "count", "tasks"]),
    }),
    createPlaceholder({
      moduleId: "module.hrm",
      name: "HRM",
      permission: MODULE_READ_PERMISSIONS.hrm,
      capabilities: Object.freeze(["summary", "count", "team"]),
    }),
    createPlaceholder({
      moduleId: "module.finance",
      name: "Finance",
      permission: MODULE_READ_PERMISSIONS.finance,
      capabilities: Object.freeze(["summary", "count", "invoices"]),
    }),
    createPlaceholder({
      moduleId: "module.calendar",
      name: "Calendar",
      permission: MODULE_READ_PERMISSIONS.calendar,
      capabilities: Object.freeze(["summary", "count", "events"]),
    }),
    createPlaceholder({
      moduleId: "module.documents",
      name: "Documents",
      permission: MODULE_READ_PERMISSIONS.documents,
      capabilities: Object.freeze(["summary", "count", "documents"]),
    }),
    createPlaceholder({
      moduleId: "module.reports",
      name: "Reports",
      permission: MODULE_READ_PERMISSIONS.reports,
      capabilities: Object.freeze(["summary", "count", "reports"]),
    }),
    createPlaceholder({
      moduleId: "module.notifications",
      name: "Notifications",
      permission: MODULE_READ_PERMISSIONS.notifications,
      capabilities: Object.freeze(["summary", "count", "notifications"]),
    }),
    createPlaceholder({
      moduleId: "module.storage",
      name: "Storage",
      permission: MODULE_READ_PERMISSIONS.storage,
      capabilities: Object.freeze(["summary", "count", "files"]),
    }),
    createPlaceholder({
      moduleId: "module.settings",
      name: "Settings",
      permission: MODULE_READ_PERMISSIONS.settings,
      capabilities: Object.freeze(["summary", "settings"]),
    }),
  ]);
