/**
 * Web-side SaaS observability / flag diagnostics (Phase 8 Phase 2).
 */

import {
  getSaasFeatureFlags,
  isSaasObservabilityEnabled,
  isSaasOperationalReadinessEnabled,
} from "../feature-flags";

export function getSaasFlagDiagnostics(): {
  enabledCount: number;
  enabled: string[];
  snapshot: ReturnType<typeof getSaasFeatureFlags>;
} {
  const snapshot = getSaasFeatureFlags();
  const enabled = Object.entries(snapshot)
    .filter(([, on]) => on)
    .map(([id]) => id);
  return { enabledCount: enabled.length, enabled, snapshot };
}

export function logSaasWebDiagnostics(tag: string): void {
  if (
    !isSaasObservabilityEnabled() &&
    !isSaasOperationalReadinessEnabled()
  ) {
    return;
  }
  if (typeof console === "undefined") return;
  const diag = getSaasFlagDiagnostics();
  console.info(
    `[saas:${tag}] flags_enabled=${diag.enabledCount}`,
    diag.enabled,
  );
}
