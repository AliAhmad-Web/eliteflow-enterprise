/**
 * Meta WhatsApp Business Cloud API sender.
 * Used by NotificationQueue WHATSAPP processing — no new product module.
 */

import {
  isWhatsappCloudConfigured,
  whatsappConfig,
} from "../../config/whatsapp.config.js";

export class WhatsappDeliveryError extends Error {
  readonly providerMessage: string;
  readonly statusCode?: number;

  constructor(message: string, providerMessage: string, statusCode?: number) {
    super(message);
    this.name = "WhatsappDeliveryError";
    this.providerMessage = providerMessage;
    this.statusCode = statusCode;
  }
}

/** Normalize to digits-only E.164-ish (Meta expects country code, no +). */
export function normalizeWhatsappTo(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) {
    throw new WhatsappDeliveryError(
      "Invalid WhatsApp destination phone number",
      `to=${phone}`,
    );
  }
  return digits;
}

export async function sendWhatsappCloudText(input: {
  to: string;
  body: string;
}): Promise<{ messageId: string | null }> {
  if (!isWhatsappCloudConfigured()) {
    throw new WhatsappDeliveryError(
      "WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
      "missing credentials",
    );
  }

  const to = normalizeWhatsappTo(input.to);
  const text = input.body.trim();
  if (!text) {
    throw new WhatsappDeliveryError(
      "WhatsApp message body is empty",
      "empty body",
    );
  }

  const url = `${whatsappConfig.graphBase}/${whatsappConfig.apiVersion}/${whatsappConfig.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${whatsappConfig.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: text.slice(0, 4096),
      },
    }),
  });

  const raw = await response.text();
  let parsed: {
    messages?: Array<{ id?: string }>;
    error?: { message?: string; code?: number };
  } = {};
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    // keep raw
  }

  if (!response.ok) {
    const providerMessage =
      parsed.error?.message ?? raw.slice(0, 500) ?? `HTTP ${response.status}`;
    throw new WhatsappDeliveryError(
      `WhatsApp send failed: ${providerMessage}`,
      providerMessage,
      response.status,
    );
  }

  const messageId = parsed.messages?.[0]?.id ?? null;
  return { messageId };
}

/** Optional delivery lookup (accepted → delivered/read when Graph returns status). */
export async function fetchWhatsappMessageStatus(
  messageId: string,
): Promise<"sent" | "delivered" | "read" | "failed" | "unknown"> {
  if (!isWhatsappCloudConfigured() || !messageId) return "unknown";

  const url = `${whatsappConfig.graphBase}/${whatsappConfig.apiVersion}/${messageId}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${whatsappConfig.accessToken}`,
    },
  });

  if (!response.ok) return "unknown";

  try {
    const data = (await response.json()) as {
      status?: string;
      statuses?: Array<{ status?: string }>;
    };
    const status = (
      data.status ??
      data.statuses?.[0]?.status ??
      ""
    ).toLowerCase();
    if (status === "read") return "read";
    if (status === "delivered") return "delivered";
    if (status === "sent" || status === "accepted") return "sent";
    if (status === "failed") return "failed";
    return "unknown";
  } catch {
    return "unknown";
  }
}
