/**
 * Provider-agnostic communication channel helpers (Phase 7).
 * Used by NotificationDispatcher — WhatsApp Meta Cloud when configured.
 */

import { isWhatsappCloudConfigured } from "../../config/whatsapp.config.js";

export type ApiDeliveryState =
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "provider_deferred"
  | "awaiting_approval"
  | "retry_prepared";

export function buildWhatsappQueuePayload(input: {
  title: string;
  body: string;
  orchestrationEnabled: boolean;
}): Record<string, unknown> {
  const configured = isWhatsappCloudConfigured();
  return {
    title: input.title,
    body: input.body,
    provider: configured ? "META_CLOUD" : "DEFERRED",
    deliveryState: (configured
      ? "queued"
      : "provider_deferred") satisfies ApiDeliveryState,
    retryPrepared: true,
    approvalCompatible: true,
    ...(input.orchestrationEnabled
      ? {
          orchestration: {
            channel: "WHATSAPP",
            source: "notification_dispatcher",
          },
        }
      : {}),
  };
}

export function whatsappProviderDeferredReason(): string {
  return "PROVIDER_DEFERRED: WhatsApp Business API not connected — set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID";
}

export function buildWhatsappMessageBody(input: {
  title?: string;
  body?: string;
}): string {
  const title = input.title?.trim() ?? "";
  const body = input.body?.trim() ?? "";
  if (title && body) return `${title}\n\n${body}`;
  return body || title;
}

export function buildEmailQueueAutomationFields(input: {
  automationEnabled: boolean;
  templatesEnabled: boolean;
  templateCode?: string;
}): Record<string, unknown> {
  if (!input.automationEnabled && !input.templatesEnabled) {
    return {};
  }
  return {
    automation: input.automationEnabled,
    approvalAware: input.automationEnabled,
    retryPrepared: true,
    deliveryState: "queued" satisfies ApiDeliveryState,
    ...(input.templatesEnabled ? { templateEnhanced: true } : {}),
    ...(input.templateCode ? { templateCode: input.templateCode } : {}),
  };
}

export function enhanceNotificationEmailHtml(
  html: string,
  templatesEnabled: boolean,
): string {
  if (!templatesEnabled) return html;
  if (html.includes("data-eliteflow-email-template")) return html;
  return html.replace(
    "</div>",
    `<p data-eliteflow-email-template="1" style="color:#888;font-size:11px;margin-top:16px;">EliteFlow notification template</p></div>`,
  );
}
