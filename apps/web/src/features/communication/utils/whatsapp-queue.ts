/**
 * Provider-agnostic WhatsApp queue composition (Phase 7).
 * Live delivery uses Meta Cloud API on the API worker when configured.
 */

export const COMMUNICATION_DELIVERY_STATES = [
  "queued",
  "processing",
  "sent",
  "delivered",
  "read",
  "failed",
  "provider_deferred",
  "awaiting_approval",
] as const;

export type CommunicationDeliveryState =
  (typeof COMMUNICATION_DELIVERY_STATES)[number];

export interface WhatsappQueuePayload {
  title: string;
  body: string;
  provider: "NOT_INTEGRATED" | "DEFERRED" | "META_CLOUD";
  deliveryState: CommunicationDeliveryState;
  retryPrepared: boolean;
  approvalCompatible: boolean;
  orchestration?: {
    channel: "WHATSAPP";
    source: "notification_dispatcher";
  };
}

export function composeWhatsappQueuePayload(input: {
  title: string;
  body: string;
  orchestrationEnabled?: boolean;
  configured?: boolean;
}): WhatsappQueuePayload {
  const configured = Boolean(input.configured);
  return {
    title: input.title,
    body: input.body,
    provider: configured ? "META_CLOUD" : "DEFERRED",
    deliveryState: configured ? "queued" : "provider_deferred",
    retryPrepared: true,
    approvalCompatible: true,
    ...(input.orchestrationEnabled
      ? {
          orchestration: {
            channel: "WHATSAPP" as const,
            source: "notification_dispatcher" as const,
          },
        }
      : {}),
  };
}

export function whatsappProviderDeferredReason(): string {
  return "PROVIDER_DEFERRED: WhatsApp Business API not connected — set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID";
}
