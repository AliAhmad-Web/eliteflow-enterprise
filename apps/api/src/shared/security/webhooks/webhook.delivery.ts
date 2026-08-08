/**
 * Webhook HTTP delivery — TLS-aware POST with signed EliteFlow headers.
 */

import { WEBHOOK_HEADERS } from "./webhook.constants.js";
import type { WebhookSecurityHeaders } from "./webhook.types.js";

export interface WebhookHttpResult {
  success: boolean;
  statusCode: number | null;
  error: string | null;
  deliveredAt: string;
}

function assertHttpsUrl(url: string): void {
  const lower = url.trim().toLowerCase();
  if (lower.startsWith("http://")) {
    if (!lower.includes("localhost") && !lower.includes("127.0.0.1")) {
      throw new Error("Webhook endpoints must use HTTPS (TLS only)");
    }
  } else if (!lower.startsWith("https://")) {
    throw new Error("Webhook endpoints must use HTTPS");
  }
}

export function sanitizeUrlHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid-host";
  }
}

export async function deliverSignedWebhook(input: {
  url: string;
  body: string;
  securityHeaders: WebhookSecurityHeaders;
  extraHeaders?: Record<string, string>;
}): Promise<WebhookHttpResult> {
  const deliveredAt = new Date().toISOString();
  assertHttpsUrl(input.url);

  try {
    const res = await fetch(input.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...input.extraHeaders,
        [WEBHOOK_HEADERS.SIGNATURE]: input.securityHeaders[WEBHOOK_HEADERS.SIGNATURE],
        [WEBHOOK_HEADERS.TIMESTAMP]: input.securityHeaders[WEBHOOK_HEADERS.TIMESTAMP],
        [WEBHOOK_HEADERS.NONCE]: input.securityHeaders[WEBHOOK_HEADERS.NONCE],
        [WEBHOOK_HEADERS.DELIVERY]: input.securityHeaders[WEBHOOK_HEADERS.DELIVERY],
        [WEBHOOK_HEADERS.KEY_ID]: input.securityHeaders[WEBHOOK_HEADERS.KEY_ID],
      },
      body: input.body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        success: false,
        statusCode: res.status,
        error: text.slice(0, 200) || `HTTP ${res.status}`,
        deliveredAt,
      };
    }

    return {
      success: true,
      statusCode: res.status,
      error: null,
      deliveredAt,
    };
  } catch (error) {
    return {
      success: false,
      statusCode: null,
      error: error instanceof Error ? error.message : "Delivery failed",
      deliveredAt,
    };
  }
}
