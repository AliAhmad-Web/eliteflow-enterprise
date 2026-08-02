/**
 * Enterprise Module Data Access Layer public exports.
 */

export type { AiModuleDataQueryKind, AiModuleDataRequest } from "./module-data-request.js";
export type {
  AiModuleDataStatus,
  AiModuleDataSummaryItem,
  AiModuleDataResponse,
  AiModuleDataBundle,
} from "./module-data-response.js";
export type { AiModuleDataContext } from "./module-data-context.js";
export type {
  AiModuleDataHealth,
  AiModuleDataProviderMetadata,
  AiModuleDataProvider,
} from "./module-data-provider.js";
export { AiModuleDataRegistry } from "./module-data-registry.js";
export type { ResolveModuleDataProviderInput } from "./resolve-module-data-provider.js";
export { resolveModuleDataProvider } from "./resolve-module-data-provider.js";
export {
  BUILTIN_MODULE_DATA_PROVIDERS,
  enterpriseModuleDataRegistry,
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
} from "./builtin-data-providers.js";
export { PLACEHOLDER_MODULE_DATA_PROVIDERS } from "./placeholder-data-providers.js";
export { SERVICE_MODULE_DATA_PROVIDERS } from "./service-data-providers.js";
export {
  createModuleDataProvider,
  createSwitchableModuleDataProvider,
} from "./create-module-data-provider.js";
export type { FetchModuleDataInput } from "./fetch-module-data.js";
export { fetchModuleData } from "./fetch-module-data.js";
export { formatModuleDataForRuntime } from "./format-module-data-for-runtime.js";
