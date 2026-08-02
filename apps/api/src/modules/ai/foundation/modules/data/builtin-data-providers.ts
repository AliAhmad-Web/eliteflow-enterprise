/**
 * Built-in Module Data Providers.
 * When AI_MODULE_SERVICE_INTEGRATION=false → placeholder (empty) behavior.
 * When AI_MODULE_SERVICE_INTEGRATION=true → existing EliteFlow service adapters.
 */

import { isAiModuleServiceIntegrationEnabled } from "../../feature-flags.js";
import type { AiModuleDataProvider } from "./module-data-provider.js";
import { AiModuleDataRegistry } from "./module-data-registry.js";
import { createSwitchableModuleDataProvider } from "./create-module-data-provider.js";
import { PLACEHOLDER_MODULE_DATA_PROVIDERS } from "./placeholder-data-providers.js";
import {
  SERVICE_MODULE_DATA_PROVIDERS,
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
} from "./service-data-providers.js";

function byModuleId(
  providers: readonly AiModuleDataProvider[],
  moduleId: string,
): AiModuleDataProvider {
  const found = providers.find((p) => p.moduleId === moduleId);
  if (!found) {
    throw new Error(`Missing module data provider: ${moduleId}`);
  }
  return found;
}

function switchable(moduleId: string): AiModuleDataProvider {
  return createSwitchableModuleDataProvider({
    placeholder: byModuleId(PLACEHOLDER_MODULE_DATA_PROVIDERS, moduleId),
    service: byModuleId(SERVICE_MODULE_DATA_PROVIDERS, moduleId),
    isServiceEnabled: isAiModuleServiceIntegrationEnabled,
  });
}

export const crmDataProvider: AiModuleDataProvider = switchable("module.crm");
export const projectsDataProvider: AiModuleDataProvider =
  switchable("module.projects");
export const tasksDataProvider: AiModuleDataProvider = switchable("module.tasks");
export const hrmDataProvider: AiModuleDataProvider = switchable("module.hrm");
export const financeDataProvider: AiModuleDataProvider =
  switchable("module.finance");
export const calendarDataProvider: AiModuleDataProvider =
  switchable("module.calendar");
export const documentsDataProvider: AiModuleDataProvider =
  switchable("module.documents");
export const reportsDataProvider: AiModuleDataProvider =
  switchable("module.reports");
export const notificationsDataProvider: AiModuleDataProvider =
  switchable("module.notifications");
export const storageDataProvider: AiModuleDataProvider =
  switchable("module.storage");
export const settingsDataProvider: AiModuleDataProvider =
  switchable("module.settings");

export const BUILTIN_MODULE_DATA_PROVIDERS: readonly AiModuleDataProvider[] =
  Object.freeze([
    crmDataProvider,
    projectsDataProvider,
    tasksDataProvider,
    hrmDataProvider,
    financeDataProvider,
    calendarDataProvider,
    documentsDataProvider,
    reportsDataProvider,
    notificationsDataProvider,
    storageDataProvider,
    settingsDataProvider,
  ]);

/** Process-wide Module Data Registry (seeded with built-in read providers). */
export const enterpriseModuleDataRegistry = new AiModuleDataRegistry(
  BUILTIN_MODULE_DATA_PROVIDERS,
);

/** Direct service-adapter exports (for tests / inspection). */
export {
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
};
