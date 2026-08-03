/**
 * Communication orchestration helpers (Phase 7 Phase 2).
 * Composes channel routing decisions — does not replace Action / Notification pipelines.
 */

export const COMMUNICATION_CHANNELS = [
  "IN_APP",
  "EMAIL",
  "WHATSAPP",
  "PUSH",
  "SMS",
] as const;

export type CommunicationChannelId = (typeof COMMUNICATION_CHANNELS)[number];

export interface CommunicationOrchestrationPlan {
  channels: CommunicationChannelId[];
  requiresApproval: boolean;
  auditAction: string;
  notes: string[];
}

export function composeCommunicationOrchestration(input: {
  sendEmail?: boolean;
  whatsappEnabled?: boolean;
  inApp?: boolean;
  approvalRequired?: boolean;
  aiOrigin?: boolean;
}): CommunicationOrchestrationPlan {
  const channels: CommunicationChannelId[] = [];
  const notes: string[] = [];

  if (input.inApp !== false) {
    channels.push("IN_APP");
  }
  if (input.sendEmail) {
    channels.push("EMAIL");
    notes.push("Email via NotificationDispatcher → emailService");
  }
  if (input.whatsappEnabled) {
    channels.push("WHATSAPP");
    notes.push("WhatsApp via queue (provider deferred)");
  }
  if (input.aiOrigin) {
    notes.push("AI Assistant / Action Framework origin");
  }

  return {
    channels,
    requiresApproval: Boolean(input.approvalRequired),
    auditAction: "communication.orchestrate",
    notes,
  };
}

export function deliveryStatusLabel(
  state:
    | "queued"
    | "processing"
    | "sent"
    | "failed"
    | "provider_deferred"
    | "awaiting_approval"
    | "retry_prepared",
): string {
  switch (state) {
    case "queued":
      return "Queued";
    case "processing":
      return "Processing";
    case "sent":
      return "Sent";
    case "failed":
      return "Failed";
    case "provider_deferred":
      return "Provider deferred";
    case "awaiting_approval":
      return "Awaiting approval";
    case "retry_prepared":
      return "Retry prepared";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
