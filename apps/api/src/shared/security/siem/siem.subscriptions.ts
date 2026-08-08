/**
 * Bootstrap SIEM subscriptions without modifying MonitoringService source.
 * Wraps the exported singleton's `report` method at startup.
 */

import { securityMonitoringService } from "../monitoring/index.js";
import type { ReportThreatInput } from "../monitoring/monitoring.types.js";
import { logger } from "../logger.js";
import { isSiemEnabled } from "./siem.config.js";
import { siemIntegrationService } from "./siem.service.js";

let subscribed = false;

type ReportFn = (input: ReportThreatInput) => Promise<unknown>;

/**
 * Install monitoring → SIEM fan-out. Safe to call multiple times.
 * Does not alter MonitoringService business logic — only wraps the singleton.
 */
export function startSiemSubscriptions(): void {
  if (subscribed) return;
  subscribed = true;

  siemIntegrationService.start();

  const originalReport = securityMonitoringService.report.bind(
    securityMonitoringService,
  ) as ReportFn;

  securityMonitoringService.report = (async (input: ReportThreatInput) => {
    const result = await originalReport(input);
    try {
      if (isSiemEnabled()) {
        siemIntegrationService.ingestMonitoring({
          type: input.type,
          userId: input.userId,
          resource: input.resource,
          resourceId: input.resourceId,
          message: input.message,
          metadata: {
            ...(input.metadata ?? {}),
            ...(result &&
            typeof result === "object" &&
            "incidentId" in result &&
            (result as { incidentId?: string | null }).incidentId
              ? {
                  incidentId: (result as { incidentId: string }).incidentId,
                }
              : {}),
            ...(result &&
            typeof result === "object" &&
            "severity" in result
              ? { severity: (result as { severity: string }).severity }
              : {}),
          },
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          severity:
            result && typeof result === "object" && "severity" in result
              ? String((result as { severity: string }).severity)
              : undefined,
          incidentId:
            result && typeof result === "object" && "incidentId" in result
              ? ((result as { incidentId: string | null }).incidentId ??
                undefined)
              : undefined,
        });
      }
    } catch (error) {
      logger.error("[siem] monitoring subscription fan-out failed:", error);
    }
    return result;
  }) as typeof securityMonitoringService.report;

  logger.info(
    `[siem] subscriptions started (enabled=${isSiemEnabled()})`,
  );
}
