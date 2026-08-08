import type { Request } from "express";

import { isApiSecurityMonitoringEnabled } from "../../config/security-flags.js";
import { AUTH_AUDIT_RESOURCE } from "../../modules/auth/auth.constants.js";
import { securityMonitoringService } from "../security/monitoring/index.js";
import { writeAuditLogSafe } from "../security/write-audit-log.js";

const AUTH_Z_AUDIT_ACTIONS = {
  PERMISSION_DENIED: "authz.permission_denied",
  ROLE_MISMATCH: "authz.role_mismatch",
  UNAUTHORIZED_ROUTE: "authz.unauthorized_route",
  ADMIN_ENDPOINT_DENIED: "authz.admin_endpoint_denied",
} as const;

interface AuthorizationDeniedInput {
  req: Request;
  reason:
    | "permission_denied"
    | "role_mismatch"
    | "unauthorized_route"
    | "admin_endpoint_denied";
  requiredRoles?: readonly string[];
  requiredPermissions?: readonly string[];
  mode?: "any" | "all";
}

function mapAction(
  reason: AuthorizationDeniedInput["reason"],
): string {
  switch (reason) {
    case "permission_denied":
      return AUTH_Z_AUDIT_ACTIONS.PERMISSION_DENIED;
    case "role_mismatch":
      return AUTH_Z_AUDIT_ACTIONS.ROLE_MISMATCH;
    case "unauthorized_route":
      return AUTH_Z_AUDIT_ACTIONS.UNAUTHORIZED_ROUTE;
    case "admin_endpoint_denied":
      return AUTH_Z_AUDIT_ACTIONS.ADMIN_ENDPOINT_DENIED;
    default: {
      const exhaustive: never = reason;
      return exhaustive;
    }
  }
}

/**
 * Best-effort audit write for authorization failures.
 * Never throws into the request pipeline.
 */
export async function logAuthorizationDenied(
  input: AuthorizationDeniedInput,
): Promise<void> {
  const ip =
    typeof input.req.headers["x-forwarded-for"] === "string"
      ? input.req.headers["x-forwarded-for"].split(",")[0]?.trim()
      : input.req.ip;

  const userAgent =
    typeof input.req.headers["user-agent"] === "string"
      ? input.req.headers["user-agent"]
      : null;

  const monitoring = isApiSecurityMonitoringEnabled();

  await writeAuditLogSafe(
    {
      userId: input.req.auth?.userId ?? null,
      action: mapAction(input.reason),
      resource: AUTH_AUDIT_RESOURCE,
      resourceId: input.req.originalUrl,
      metadata: {
        reason: input.reason,
        method: input.req.method,
        path: input.req.originalUrl,
        role: input.req.auth?.role ?? null,
        requiredRoles: input.requiredRoles ?? [],
        requiredPermissions: input.requiredPermissions ?? [],
        mode: input.mode ?? null,
        ...(monitoring
          ? {
              sessionId: input.req.auth?.sessionId ?? null,
              permissionCount: input.req.auth?.permissions?.length ?? 0,
              monitoring: true,
            }
          : {}),
      },
      ipAddress: ip ?? null,
      userAgent,
    },
    "authz",
  );

  if (
    input.reason === "admin_endpoint_denied" ||
    input.reason === "role_mismatch"
  ) {
    void securityMonitoringService.reportPrivilegeEscalation({
      userId: input.req.auth?.userId ?? null,
      resource: "authz",
      resourceId: input.req.originalUrl,
      message: `Privilege escalation attempt: ${input.reason}`,
      metadata: {
        reason: input.reason,
        requiredRoles: input.requiredRoles ?? [],
        requiredPermissions: input.requiredPermissions ?? [],
      },
      ipAddress: ip ?? null,
      userAgent,
    });
  } else {
    void securityMonitoringService.reportRbacDenial({
      userId: input.req.auth?.userId ?? null,
      resource: "authz",
      resourceId: input.req.originalUrl,
      message: `RBAC denial: ${input.reason}`,
      metadata: {
        reason: input.reason,
        requiredPermissions: input.requiredPermissions ?? [],
      },
      ipAddress: ip ?? null,
      userAgent,
    });
  }
}

export { AUTH_Z_AUDIT_ACTIONS };
