/**
 * Enterprise Module Integration Framework public exports.
 */

export type {
  AiEnterpriseModuleAvailability,
  AiEnterpriseModuleDefinition,
  AiEnterpriseModuleSummary,
} from "./module-definition.js";
export {
  AiEnterpriseModuleRegistry,
  enterpriseModuleRegistry,
} from "./module-registry.js";
export {
  BUILTIN_ENTERPRISE_MODULES,
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
} from "./builtin-modules.js";
export type {
  AiSelectedModules,
  ResolveSelectedModulesInput,
} from "./module-resolver.js";
export { resolveSelectedModules } from "./module-resolver.js";
export type { AiModuleResolutionContext } from "./module-context.js";
export {
  resolveIntentHints,
  resolveEntityTypeHints,
} from "./module-context.js";
export {
  toModuleSummary,
  collectModuleCapabilities,
} from "./module-capabilities.js";
export { formatSelectedModulesForRuntime } from "./module-runtime.js";
export type {
  AiModuleDataQueryKind,
  AiModuleDataRequest,
  AiModuleDataStatus,
  AiModuleDataSummaryItem,
  AiModuleDataResponse,
  AiModuleDataBundle,
  AiModuleDataContext,
  AiModuleDataHealth,
  AiModuleDataProviderMetadata,
  AiModuleDataProvider,
  ResolveModuleDataProviderInput,
  FetchModuleDataInput,
} from "./data/index.js";
export {
  AiModuleDataRegistry,
  resolveModuleDataProvider,
  enterpriseModuleDataRegistry,
  BUILTIN_MODULE_DATA_PROVIDERS,
  fetchModuleData,
  formatModuleDataForRuntime,
} from "./data/index.js";
