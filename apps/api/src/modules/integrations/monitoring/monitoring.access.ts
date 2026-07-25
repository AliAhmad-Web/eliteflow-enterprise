/**
 * Re-export access helpers from the canonical integrations.access module.
 * Keeps existing monitoring/* imports stable without duplicating RBAC logic.
 */

export {
  assertVisible,
  canManageIntegrations,
  canReadIntegrations,
  hasPermission,
  requireIntegrationAccess,
  requireManage,
  requireRead,
  resolveAllowedIds,
} from "../integrations.access.js";
