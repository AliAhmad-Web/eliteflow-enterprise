/**
 * SIEM transports: HTTPS webhook, REST, Syslog RFC5424, JSON export, batch upload.
 */

import { connect as tlsConnect } from "node:tls";

import {
  applySignatureHeaders,
  assertTlsEndpoint,
  buildAuthHeaders,
} from "./siem.auth.js";
import { getSiemConfig } from "./siem.config.js";
import type {
  SiemDeliveryResult,
  SiemEvent,
  SiemProvider,
  SiemRuntimeProviderConfig,
  SiemTransport,
} from "./siem.types.js";
import {
  isWebhookSecurityEnabled,
  webhookSecurityService,
} from "../webhooks/index.js";

function toRfc5424(event: SiemEvent, appName = "enterprise-siem"): string {
  const pri = 14; // user-level notice
  const timestamp = event.timestamp;
  const hostname = "api";
  const msgId = event.eventType.slice(0, 32);
  const structured = [
    `[siem@32473`,
    `eventId="${event.eventId}"`,
    `severity="${event.severity}"`,
    `category="${event.category}"`,
    `eventType="${event.eventType}"`,
    event.tenantId ? `tenantId="${event.tenantId}"` : null,
    event.userId ? `userId="${event.userId}"` : null,
    event.correlationId ? `correlationId="${event.correlationId}"` : null,
    `]`,
  ]
    .filter(Boolean)
    .join(" ");
  const msg = JSON.stringify({
    resource: event.resource,
    action: event.action,
    result: event.result,
    ipAddress: event.ipAddress,
    metadata: event.metadata,
  });
  return `<${pri}>1 ${timestamp} ${hostname} ${appName} - ${msgId} ${structured} ${msg}`;
}

/**
 * Enrich for HTTPS log sinks (Better Stack / Axiom-compatible) without
 * removing canonical SIEM fields. Never invent secrets.
 */
function enrichForHttpsLogSink(
  event: SiemEvent,
): SiemEvent & { message: string; level: string; dt: string } {
  const metaMessage =
    typeof event.metadata.message === "string" ? event.metadata.message : null;
  return {
    ...event,
    message: metaMessage || `${event.category}:${event.eventType}`,
    level: event.severity,
    dt: event.timestamp,
  };
}

/**
 * HTTPS body shapes:
 * - BATCH_UPLOAD → `{ events: [...] }` (internal envelope)
 * - HTTPS_WEBHOOK / REST_API → always a JSON **array** of events
 *   (Axiom ingest requires an array; Better Stack also accepts arrays)
 */
function serializeHttpBody(
  events: SiemEvent[],
  transport: SiemTransport,
  _provider: SiemProvider,
): string {
  const enriched = events.map(enrichForHttpsLogSink);
  if (transport === "BATCH_UPLOAD") {
    return JSON.stringify({ events: enriched });
  }
  return JSON.stringify(enriched);
}

async function httpsPost(
  endpoint: string,
  body: string,
  headers: Record<string, string>,
  provider: SiemProvider,
  timeoutMs: number,
): Promise<SiemDeliveryResult> {
  assertTlsEndpoint(endpoint);
  const deliveredAt = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        provider,
        success: false,
        statusCode: res.status,
        error: text.slice(0, 200) || `HTTP ${res.status}`,
        deliveredAt,
      };
    }
    return {
      provider,
      success: true,
      statusCode: res.status,
      deliveredAt,
    };
  } catch (error) {
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || error.message.includes("aborted"));
    return {
      provider,
      success: false,
      error: aborted
        ? `Request timeout after ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : "Delivery failed",
      deliveredAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function syslogTls(
  target: string,
  lines: string[],
  provider: SiemProvider,
  timeoutMs: number,
): Promise<SiemDeliveryResult> {
  const deliveredAt = new Date().toISOString();
  const [host, portRaw] = target.split(":");
  const port = Number.parseInt(portRaw ?? "6514", 10);
  if (!host || !Number.isFinite(port)) {
    return {
      provider,
      success: false,
      error: "Invalid syslog target (host:port)",
      deliveredAt,
    };
  }

  return new Promise((resolve) => {
    const socket = tlsConnect(
      { host, port, servername: host, rejectUnauthorized: true },
      () => {
        socket.write(lines.map((l) => `${l}\n`).join(""));
        socket.end();
      },
    );
    socket.setTimeout(timeoutMs);
    socket.on("error", (error) => {
      resolve({
        provider,
        success: false,
        error: error.message,
        deliveredAt,
      });
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve({
        provider,
        success: false,
        error: "Syslog TLS timeout",
        deliveredAt,
      });
    });
    socket.on("close", (hadError) => {
      if (!hadError) {
        resolve({ provider, success: true, deliveredAt });
      }
    });
  });
}

export async function deliverViaTransport(
  events: SiemEvent[],
  config: SiemRuntimeProviderConfig,
  transportOverride?: SiemTransport,
): Promise<SiemDeliveryResult> {
  const transport = transportOverride ?? config.transport;
  const provider = config.provider;
  const deliveredAt = new Date().toISOString();
  const timeoutMs = getSiemConfig().requestTimeoutMs;

  if (events.length === 0) {
    return { provider, success: true, deliveredAt };
  }

  if (transport === "JSON_EXPORT") {
    return { provider, success: true, deliveredAt };
  }

  if (transport === "SYSLOG_RFC5424") {
    const target = config.syslogTarget ?? config.endpoint;
    if (!target) {
      return {
        provider,
        success: false,
        error: "Syslog target not configured",
        deliveredAt,
      };
    }
    const lines = events.map((e) => toRfc5424(e));
    return syslogTls(
      target.replace(/^tls:\/\//i, ""),
      lines,
      provider,
      timeoutMs,
    );
  }

  const endpoint = config.endpoint;
  if (!endpoint) {
    return {
      provider,
      success: false,
      error: "Endpoint not configured",
      deliveredAt,
    };
  }

  const body = serializeHttpBody(events, transport, provider);

  let headers = buildAuthHeaders(config);
  headers = applySignatureHeaders(headers, body, config.webhookSigningSecret);

  // Opt-in Enterprise Signed Webhooks — additive EliteFlow headers only.
  if (isWebhookSecurityEnabled()) {
    const eventId =
      events[0]?.eventId ??
      events[0]?.correlationId ??
      events[0]?.eventType ??
      "siem_batch";
    const signed = webhookSecurityService.signOutbound({
      body,
      eventId: String(eventId),
    });
    if (signed) {
      headers = { ...headers, ...signed.headers };
    }
  }

  if (
    transport === "REST_API" ||
    transport === "HTTPS_WEBHOOK" ||
    transport === "BATCH_UPLOAD"
  ) {
    return httpsPost(endpoint, body, headers, provider, timeoutMs);
  }

  return {
    provider,
    success: false,
    error: `Unsupported transport: ${transport}`,
    deliveredAt,
  };
}

export function exportEventsAsJson(events: SiemEvent[]): string {
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), events },
    null,
    2,
  );
}
