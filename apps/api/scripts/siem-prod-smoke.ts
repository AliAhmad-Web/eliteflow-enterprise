/**
 * One-shot SIEM connectivity test using Railway-injected env.
 * Usage: npx @railway/cli@latest run --service api -- npx tsx apps/api/scripts/siem-prod-smoke.ts
 */
import {
  getSiemConfig,
  isSiemEnabled,
  resetSiemConfigCache,
  siemIntegrationService,
} from "../src/shared/security/siem/index.js";

resetSiemConfigCache();
const cfg = getSiemConfig(true);

console.log(
  JSON.stringify(
    {
      enabled: isSiemEnabled(),
      providers: cfg.providers
        .filter((p) => p.enabled)
        .map((p) => ({
          provider: p.provider,
          endpointHost: p.endpoint
            ? new URL(p.endpoint).host
            : null,
          authMode: p.authMode,
          hasCredential: Boolean(p.apiKey || p.bearerToken),
        })),
    },
    null,
    2,
  ),
);

const statusBefore = siemIntegrationService.getStatus();
console.log("statusBefore", {
  enabled: statusBefore.enabled,
  connectionStatus: statusBefore.connectionStatus,
  successfulDeliveries: statusBefore.successfulDeliveries,
  failedDeliveries: statusBefore.failedDeliveries,
});

const result = await siemIntegrationService.testConnectivity();
console.log(
  JSON.stringify(
    {
      overallSuccess: result.overallSuccess,
      testedAt: result.testedAt,
      results: result.results.map((r) => ({
        provider: r.provider,
        success: r.success,
        statusCode: r.statusCode ?? null,
        error: r.error ?? null,
      })),
    },
    null,
    2,
  ),
);

const statusAfter = siemIntegrationService.getStatus();
console.log("statusAfter", {
  connectionStatus: statusAfter.connectionStatus,
  connectedProviders: statusAfter.connectedProviders,
  lastError: statusAfter.lastError,
});

if (!result.overallSuccess) process.exitCode = 1;
