/**
 * Service-backed Module Data Providers.
 * Call existing EliteFlow services only — never Prisma/repositories/SQL.
 * Emit safe counts/summaries only — never raw records, emails, tokens, or secrets.
 */

import { aiService } from "../../../ai.service.js";
import { clientsService } from "../../../../clients/clients.service.js";
import { projectsService } from "../../../../projects/projects.service.js";
import { tasksService } from "../../../../tasks/tasks.service.js";
import { invoicesService } from "../../../../invoices/invoices.service.js";
import { calendarService } from "../../../../calendar/calendar.service.js";
import { teamService } from "../../../../team/team.service.js";
import { reportsService } from "../../../../reports/reports.service.js";
import { notificationsService } from "../../../../notifications/notifications.service.js";
import { filesService } from "../../../../files/files.service.js";
import { settingsService } from "../../../../settings/settings.service.js";

import type { AiModuleDataProvider } from "./module-data-provider.js";
import { createModuleDataProvider } from "./create-module-data-provider.js";
import {
  actorFromContext,
  emptyResponse,
  MODULE_READ_PERMISSIONS,
  okResponse,
  privilegedActor,
} from "./module-data-helpers.js";

export const serviceCrmDataProvider: AiModuleDataProvider =
  createModuleDataProvider({
    moduleId: "module.crm",
    name: "CRM",
    permission: MODULE_READ_PERMISSIONS.crm,
    capabilities: Object.freeze(["summary", "count", "clients"]),
    async fetchSummaries() {
      const stats = await clientsService.getStats();
      return okResponse("module.crm", "CRM", [
        { label: "Active Clients", value: stats.active },
        { label: "Total Clients", value: stats.total },
      ]);
    },
  });

export const serviceProjectsDataProvider: AiModuleDataProvider =
  createModuleDataProvider({
    moduleId: "module.projects",
    name: "Projects",
    permission: MODULE_READ_PERMISSIONS.projects,
    capabilities: Object.freeze(["summary", "count", "projects"]),
    async fetchSummaries(context) {
      const actor = actorFromContext(context);
      if (!actor) {
        return emptyResponse("module.projects", "Projects", "denied", "no_user");
      }
      const stats = await projectsService.getStats(actor);
      const open = stats.inProgress + stats.notStarted + stats.onHold;
      return okResponse("module.projects", "Projects", [
        { label: "Open Projects", value: open },
        { label: "Completed Projects", value: stats.completed },
      ]);
    },
  });

export const serviceTasksDataProvider: AiModuleDataProvider =
  createModuleDataProvider({
    moduleId: "module.tasks",
    name: "Tasks",
    permission: MODULE_READ_PERMISSIONS.tasks,
    capabilities: Object.freeze(["summary", "count", "tasks"]),
    async fetchSummaries(context) {
      const actor = actorFromContext(context);
      if (!actor) {
        return emptyResponse("module.tasks", "Tasks", "denied", "no_user");
      }
      const stats = await tasksService.getStats(actor);
      const open =
        stats.todo + stats.inProgress + stats.review + stats.blocked;
      return okResponse("module.tasks", "Tasks", [
        { label: "Today's Tasks", value: open },
        { label: "Overdue Tasks", value: stats.overdue },
      ]);
    },
  });

export const serviceHrmDataProvider: AiModuleDataProvider =
  createModuleDataProvider({
    moduleId: "module.hrm",
    name: "HRM",
    permission: MODULE_READ_PERMISSIONS.hrm,
    capabilities: Object.freeze(["summary", "count", "team"]),
    async fetchSummaries(context) {
      const actor = privilegedActor(context);
      if (!actor) {
        return emptyResponse("module.hrm", "HRM", "denied", "no_user");
      }
      const result = await teamService.listEmployees(
        { search: "", page: 1, limit: 1 },
        actor,
      );
      return okResponse("module.hrm", "HRM", [
        { label: "Team Members", value: result.pagination.total },
      ]);
    },
  });

export const serviceFinanceDataProvider: AiModuleDataProvider =
  createModuleDataProvider({
    moduleId: "module.finance",
    name: "Finance",
    permission: MODULE_READ_PERMISSIONS.finance,
    capabilities: Object.freeze(["summary", "count", "invoices"]),
    async fetchSummaries(context) {
      const actor = actorFromContext(context);
      if (!actor) {
        return emptyResponse("module.finance", "Finance", "denied", "no_user");
      }
      const stats = await invoicesService.getStats(actor);
      return okResponse("module.finance", "Finance", [
        {
          label: "Finance Summary",
          value: stats.pending + stats.overdue + stats.sent,
        },
        { label: "Paid Invoices", value: stats.paid },
      ]);
    },
  });

export const serviceCalendarDataProvider: AiModuleDataProvider =
  createModuleDataProvider({
    moduleId: "module.calendar",
    name: "Calendar",
    permission: MODULE_READ_PERMISSIONS.calendar,
    capabilities: Object.freeze(["summary", "count", "events"]),
    async fetchSummaries(context) {
      const actor = privilegedActor(context);
      if (!actor) {
        return emptyResponse("module.calendar", "Calendar", "denied", "no_user");
      }
      const result = await calendarService.upcoming(actor);
      return okResponse("module.calendar", "Calendar", [
        { label: "Upcoming Meetings", value: result.upcoming.length },
        { label: "Today's Events", value: result.today.length },
      ]);
    },
  });

export const serviceDocumentsDataProvider: AiModuleDataProvider =
  createModuleDataProvider({
    moduleId: "module.documents",
    name: "Documents",
    permission: MODULE_READ_PERMISSIONS.documents,
    capabilities: Object.freeze(["summary", "count", "documents"]),
    async fetchSummaries(context) {
      const actor = actorFromContext(context);
      if (!actor) {
        return emptyResponse(
          "module.documents",
          "Documents",
          "denied",
          "no_user",
        );
      }
      const result = await aiService.listDocuments(
        { search: "", page: 1, limit: 1 },
        actor,
      );
      return okResponse("module.documents", "Documents", [
        { label: "Unread Documents", value: result.pagination.total },
      ]);
    },
  });

export const serviceReportsDataProvider: AiModuleDataProvider =
  createModuleDataProvider({
    moduleId: "module.reports",
    name: "Reports",
    permission: MODULE_READ_PERMISSIONS.reports,
    capabilities: Object.freeze(["summary", "count", "reports"]),
    async fetchSummaries(context) {
      const actor = privilegedActor(context);
      if (!actor) {
        return emptyResponse("module.reports", "Reports", "denied", "no_user");
      }
      const result = await reportsService.listSaved(actor);
      return okResponse("module.reports", "Reports", [
        { label: "Saved Reports", value: result.items.length },
      ]);
    },
  });

export const serviceNotificationsDataProvider: AiModuleDataProvider =
  createModuleDataProvider({
    moduleId: "module.notifications",
    name: "Notifications",
    permission: MODULE_READ_PERMISSIONS.notifications,
    capabilities: Object.freeze(["summary", "count", "notifications"]),
    async fetchSummaries(context) {
      const actor = privilegedActor(context);
      if (!actor) {
        return emptyResponse(
          "module.notifications",
          "Notifications",
          "denied",
          "no_user",
        );
      }
      const result = await notificationsService.unreadCount(actor);
      return okResponse("module.notifications", "Notifications", [
        { label: "Unread Notifications", value: result.count },
      ]);
    },
  });

export const serviceStorageDataProvider: AiModuleDataProvider =
  createModuleDataProvider({
    moduleId: "module.storage",
    name: "Storage",
    permission: MODULE_READ_PERMISSIONS.storage,
    capabilities: Object.freeze(["summary", "count", "files"]),
    async fetchSummaries(context) {
      const actor = privilegedActor(context);
      if (!actor) {
        return emptyResponse("module.storage", "Storage", "denied", "no_user");
      }
      const result = await filesService.listFiles(
        {
          search: "",
          view: "all",
          sortBy: "updatedAt",
          sortOrder: "desc",
          page: 1,
          limit: 1,
        },
        actor,
      );
      return okResponse("module.storage", "Storage", [
        { label: "Stored Files", value: result.pagination.total },
      ]);
    },
  });

export const serviceSettingsDataProvider: AiModuleDataProvider =
  createModuleDataProvider({
    moduleId: "module.settings",
    name: "Settings",
    permission: MODULE_READ_PERMISSIONS.settings,
    capabilities: Object.freeze(["summary", "settings"]),
    async fetchSummaries(context) {
      const actor = privilegedActor(context);
      if (!actor) {
        return emptyResponse("module.settings", "Settings", "denied", "no_user");
      }
      const overview = await settingsService.getOverview(actor);
      // Safe preference flags only — never profile, email, tokens, or secrets.
      return okResponse("module.settings", "Settings", [
        {
          label: "AI History",
          value: overview.ai.aiHistoryEnabled ? "On" : "Off",
        },
        {
          label: "Privacy Mode",
          value: overview.ai.aiPrivacyMode ? "On" : "Off",
        },
        {
          label: "Org Settings",
          value: overview.canManageOrganization ? "Available" : "Limited",
        },
      ]);
    },
  });

export const SERVICE_MODULE_DATA_PROVIDERS: readonly AiModuleDataProvider[] =
  Object.freeze([
    serviceCrmDataProvider,
    serviceProjectsDataProvider,
    serviceTasksDataProvider,
    serviceHrmDataProvider,
    serviceFinanceDataProvider,
    serviceCalendarDataProvider,
    serviceDocumentsDataProvider,
    serviceReportsDataProvider,
    serviceNotificationsDataProvider,
    serviceStorageDataProvider,
    serviceSettingsDataProvider,
  ]);
