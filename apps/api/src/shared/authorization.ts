/**
 * Authorization middleware barrel — import from here in future modules.
 *
 * Example:
 *   router.post(
 *     "/clients",
 *     authenticate,
 *     authorizePermissions(PERMISSIONS.CLIENTS_WRITE),
 *     handler,
 *   );
 */
export { authenticate } from "../middleware/auth.middleware.js";
export { authorizeRoles } from "../middleware/role.middleware.js";
export {
  authorizeAllPermissions,
  authorizeAnyPermission,
  authorizePermissions,
} from "../middleware/permission.middleware.js";
export { permissionService } from "./services/permission.service.js";
