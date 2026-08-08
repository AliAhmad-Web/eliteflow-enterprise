import { deliverViaTransport } from "../siem.transport.js";
import type {
  SiemDeliveryResult,
  SiemEvent,
  SiemProviderAdapter,
  SiemRuntimeProviderConfig,
} from "../siem.types.js";

function baseAdapter(
  provider: SiemProviderAdapter["provider"],
  defaultTransport: SiemRuntimeProviderConfig["transport"],
): SiemProviderAdapter {
  return {
    provider,
    async deliver(events, config) {
      return deliverViaTransport(events, {
        ...config,
        transport: config.transport || defaultTransport,
      });
    },
    async testConnection(config) {
      const eventId = `test-${provider.toLowerCase()}-${Date.now()}`;
      const testEvent: SiemEvent = {
        eventId,
        timestamp: new Date().toISOString(),
        tenantId: null,
        userId: null,
        sessionId: null,
        severity: "INFO",
        category: "SIEM",
        eventType: "SIEM_CONNECTIVITY_TEST",
        resource: "siem",
        action: "test",
        result: "test",
        ipAddress: null,
        deviceId: null,
        correlationId: eventId,
        riskScore: null,
        zeroTrustRisk: null,
        incidentId: null,
        complianceFramework: null,
        metadata: {
          provider,
          source: "siem_test",
          isTest: true,
          synthetic: true,
          message:
            "EliteFlow SIEM connectivity test event — safe synthetic payload",
        },
      };

      if (!config.endpoint && !config.syslogTarget) {
        const deliveredAt = new Date().toISOString();
        return {
          provider,
          success: false,
          error: "Provider endpoint not configured",
          deliveredAt,
        } satisfies SiemDeliveryResult;
      }

      return deliverViaTransport([testEvent], {
        ...config,
        transport: config.transport || defaultTransport,
      });
    },
  };
}

export const splunkAdapter = baseAdapter("SPLUNK", "REST_API");
export const sentinelAdapter = baseAdapter("SENTINEL", "HTTPS_WEBHOOK");
export const elasticAdapter = baseAdapter("ELASTIC", "REST_API");
export const qradarAdapter = baseAdapter("QRADAR", "SYSLOG_RFC5424");
export const datadogAdapter = baseAdapter("DATADOG", "HTTPS_WEBHOOK");
export const genericWebhookAdapter = baseAdapter(
  "GENERIC_WEBHOOK",
  "HTTPS_WEBHOOK",
);

export const SIEM_PROVIDER_ADAPTERS: Record<
  SiemProviderAdapter["provider"],
  SiemProviderAdapter
> = {
  SPLUNK: splunkAdapter,
  SENTINEL: sentinelAdapter,
  ELASTIC: elasticAdapter,
  QRADAR: qradarAdapter,
  DATADOG: datadogAdapter,
  GENERIC_WEBHOOK: genericWebhookAdapter,
};
