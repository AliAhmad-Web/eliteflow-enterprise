export {
  getApiVersionConfig,
  isApiVersioningEnabled,
  resetApiVersionConfigCache,
} from "./api-version.config.js";
export {
  API_VERSION_EVENTS,
  API_VERSION_HEADER,
  API_VERSION_RESPONSE_HEADER,
  API_VERSION_URI_PREFIX,
  API_VERSION_AUDIT_ACTIONS,
} from "./api-version.constants.js";
export { apiVersionMiddleware } from "./api-version.middleware.js";
export { apiVersionService } from "./api-version.service.js";
export {
  listApiVersions,
  getApiVersionDefinition,
  getDefaultVersionDefinition,
  getLatestVersionDefinition,
  normalizeVersionToken,
} from "./api-version.registry.js";
export {
  resolveCompatibleVersion,
  applyRouteAlias,
  transformResponseForVersion,
  mapLegacyDtoForVersion,
  buildDeprecationHeaders,
} from "./api-version.compatibility.js";
export type {
  ApiVersionStatus,
  ApiVersionSource,
  ApiVersionDefinition,
  ResolvedApiVersion,
  ApiVersionConfig,
  ApiVersionDashboardMetrics,
  ApiVersionStatusSnapshot,
  ApiVersionCompatibilitySnapshot,
} from "./api-version.types.js";
