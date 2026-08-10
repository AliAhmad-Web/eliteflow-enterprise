/**
 * Assert SIEM production configuration is usable when enabled.
 * Fail-closed: enabled without a reachable-configured provider → throw.
 */

import { getEnabledSiemProviders, getSiemConfig, isSiemEnabled } from "./siem.config.js";

export function assertSiemProductionConfig(): void {
  if (!isSiemEnabled()) {
    return;
  }

  const enabled = getEnabledSiemProviders();
  if (enabled.length === 0) {
    throw new Error(
      "SIEM_ENABLED but no provider is enabled — set SIEM_PROVIDERS and SIEM_<PROVIDER>_ENABLED",
    );
  }

  for (const provider of enabled) {
    if (!provider.endpoint) {
      throw new Error(
        `SIEM enabled but ${provider.provider} has no endpoint (SIEM_${provider.provider}_ENDPOINT)`,
      );
    }
    if (
      provider.authMode === "BEARER" &&
      !(provider.bearerToken && provider.bearerToken.length > 0)
    ) {
      throw new Error(
        `SIEM provider ${provider.provider} authMode=BEARER but bearer token is missing`,
      );
    }
    if (
      provider.authMode === "API_KEY" &&
      !(provider.apiKey && provider.apiKey.length > 0)
    ) {
      throw new Error(
        `SIEM provider ${provider.provider} authMode=API_KEY but API key is missing`,
      );
    }
  }

  // Touch config so mis-parses surface early
  void getSiemConfig();
}
