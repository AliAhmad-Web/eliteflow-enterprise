/**
 * Enterprise SIEM Integration — shared types.
 */

export const SIEM_PROVIDERS = [
  "SPLUNK",
  "SENTINEL",
  "ELASTIC",
  "QRADAR",
  "DATADOG",
  "GENERIC_WEBHOOK",
] as const;

export type SiemProvider = (typeof SIEM_PROVIDERS)[number];

export const SIEM_TRANSPORTS = [
  "HTTPS_WEBHOOK",
  "REST_API",
  "SYSLOG_RFC5424",
  "JSON_EXPORT",
  "BATCH_UPLOAD",
] as const;

export type SiemTransport = (typeof SIEM_TRANSPORTS)[number];

export const SIEM_AUTH_MODES = ["API_KEY", "BEARER", "NONE"] as const;
export type SiemAuthMode = (typeof SIEM_AUTH_MODES)[number];

export const SIEM_SEVERITIES = [
  "INFO",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;
export type SiemSeverity = (typeof SIEM_SEVERITIES)[number];

export const SIEM_MONITORING_EVENTS = {
  SIEM_CONNECTED: "SIEM_CONNECTED",
  SIEM_DISCONNECTED: "SIEM_DISCONNECTED",
  SIEM_DELIVERY_FAILED: "SIEM_DELIVERY_FAILED",
  SIEM_RETRY: "SIEM_RETRY",
  SIEM_QUEUE_FULL: "SIEM_QUEUE_FULL",
  SIEM_EXPORT_SUCCESS: "SIEM_EXPORT_SUCCESS",
  SIEM_EXPORT_FAILED: "SIEM_EXPORT_FAILED",
} as const;

export type SiemMonitoringEvent =
  (typeof SIEM_MONITORING_EVENTS)[keyof typeof SIEM_MONITORING_EVENTS];

export const SIEM_CONNECTION_STATUSES = [
  "CONNECTED",
  "DEGRADED",
  "DISCONNECTED",
  "DISABLED",
] as const;
export type SiemConnectionStatus = (typeof SIEM_CONNECTION_STATUSES)[number];

/** Canonical SIEM event payload — no secrets/prompts. */
export interface SiemEvent {
  eventId: string;
  timestamp: string;
  tenantId: string | null;
  userId: string | null;
  sessionId: string | null;
  severity: SiemSeverity;
  category: string;
  eventType: string;
  resource: string | null;
  action: string | null;
  result: string | null;
  ipAddress: string | null;
  deviceId: string | null;
  correlationId: string | null;
  riskScore: number | null;
  zeroTrustRisk: string | null;
  incidentId: string | null;
  complianceFramework: string | null;
  metadata: Record<string, unknown>;
}

export interface SiemQueuedItem {
  id: string;
  event: SiemEvent;
  providers: SiemProvider[];
  attempts: number;
  nextAttemptAt: number;
  createdAt: number;
  lastError?: string;
}

export interface SiemProviderConfig {
  provider: SiemProvider;
  enabled: boolean;
  transport: SiemTransport;
  endpoint: string | null;
  authMode: SiemAuthMode;
  /** Redacted in status/config APIs */
  hasCredential: boolean;
  /** Syslog host:port when transport is SYSLOG_RFC5424 */
  syslogTarget: string | null;
}

export interface SiemDeliveryResult {
  provider: SiemProvider;
  success: boolean;
  statusCode?: number;
  error?: string;
  deliveredAt: string;
}

export interface SiemProviderAdapter {
  readonly provider: SiemProvider;
  deliver(events: SiemEvent[], config: SiemRuntimeProviderConfig): Promise<SiemDeliveryResult>;
  testConnection(config: SiemRuntimeProviderConfig): Promise<SiemDeliveryResult>;
}

export interface SiemRuntimeProviderConfig {
  provider: SiemProvider;
  enabled: boolean;
  transport: SiemTransport;
  endpoint: string | null;
  authMode: SiemAuthMode;
  apiKey: string | null;
  bearerToken: string | null;
  webhookSigningSecret: string | null;
  syslogTarget: string | null;
}

export interface SiemStatusSnapshot {
  enabled: boolean;
  connectionStatus: SiemConnectionStatus;
  queueSize: number;
  deadLetterSize: number;
  offlineBufferSize: number;
  failedDeliveries: number;
  successfulDeliveries: number;
  lastExportAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  connectedProviders: SiemProvider[];
  eventThroughputLastHour: number;
  circuitBreakers: Array<{
    provider: SiemProvider;
    state: "CLOSED" | "OPEN" | "HALF_OPEN";
    failures: number;
  }>;
  evaluatedAt: string;
}

export interface SiemConfigSnapshot {
  enabled: boolean;
  batchSize: number;
  maxQueueSize: number;
  maxRetries: number;
  providers: SiemProviderConfig[];
  evaluatedAt: string;
}

export interface SiemTestResult {
  results: SiemDeliveryResult[];
  overallSuccess: boolean;
  testedAt: string;
}

export interface SiemExportResult {
  exported: number;
  format: "json";
  events: SiemEvent[];
  exportedAt: string;
}

export interface SiemRetryResult {
  requeued: number;
  remainingDeadLetters: number;
  retriedAt: string;
}

export interface SiemDashboardMetrics {
  connectionStatus: SiemConnectionStatus;
  queueSize: number;
  failedDeliveries: number;
  lastExportAt: string | null;
  connectedProviders: SiemProvider[];
  eventThroughput: number;
}
