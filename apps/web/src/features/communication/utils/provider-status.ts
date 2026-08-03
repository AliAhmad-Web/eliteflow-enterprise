/**
 * Provider configuration status for Phase 7 communication + live integrations.
 * STT/TTS: browser Web Speech when NEXT_PUBLIC_VOICE_PROVIDER is browser/web_speech.
 * WhatsApp: NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER_ID or NEXT_PUBLIC_WHATSAPP_READY (server holds secrets).
 * Email: existing emailService (server SMTP/Resend/Gmail).
 */

import {
  getVoiceProviderId,
  isVoiceSttReady,
  isVoiceTtsReady,
} from "@/features/ai/utils/speech-providers";

export type CommunicationProviderStatus =
  | "ready"
  | "not_configured"
  | "deferred";

export interface CommunicationProviderInfo {
  id: "voice_stt" | "voice_tts" | "whatsapp" | "email";
  label: string;
  status: CommunicationProviderStatus;
  message: string;
}

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

function isWhatsappUiConfigured(): boolean {
  const ready = trimEnv(process.env.NEXT_PUBLIC_WHATSAPP_READY).toLowerCase();
  if (ready === "1" || ready === "true" || ready === "yes" || ready === "on") {
    return true;
  }
  return Boolean(trimEnv(process.env.NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER_ID));
}

export function getVoiceSttProviderInfo(): CommunicationProviderInfo {
  const provider = getVoiceProviderId();
  if (provider === "none") {
    return {
      id: "voice_stt",
      label: "Speech-to-Text",
      status: "not_configured",
      message:
        "Not Configured — NEXT_PUBLIC_VOICE_PROVIDER=none. Set to browser to enable Web Speech STT.",
    };
  }
  if (typeof window !== "undefined" && isVoiceSttReady()) {
    return {
      id: "voice_stt",
      label: "Speech-to-Text",
      status: "ready",
      message: "Ready — browser Web Speech recognition (streaming interim transcripts).",
    };
  }
  if (typeof window === "undefined") {
    return {
      id: "voice_stt",
      label: "Speech-to-Text",
      status: "ready",
      message:
        "Configured for browser Web Speech STT (Chrome/Edge). Requires microphone permission.",
    };
  }
  return {
    id: "voice_stt",
    label: "Speech-to-Text",
    status: "not_configured",
    message:
      "Not Configured — Web Speech API unavailable in this browser. Use Chrome/Edge or type instead.",
  };
}

export function getVoiceTtsProviderInfo(): CommunicationProviderInfo {
  const provider = getVoiceProviderId();
  if (provider === "none") {
    return {
      id: "voice_tts",
      label: "Text-to-Speech",
      status: "not_configured",
      message:
        "Not Configured — NEXT_PUBLIC_VOICE_PROVIDER=none. Set to browser to enable Web Speech TTS.",
    };
  }
  if (typeof window !== "undefined" && isVoiceTtsReady()) {
    return {
      id: "voice_tts",
      label: "Text-to-Speech",
      status: "ready",
      message: "Ready — browser speechSynthesis playback with interrupt support.",
    };
  }
  if (typeof window === "undefined") {
    return {
      id: "voice_tts",
      label: "Text-to-Speech",
      status: "ready",
      message: "Configured for browser speechSynthesis TTS.",
    };
  }
  return {
    id: "voice_tts",
    label: "Text-to-Speech",
    status: "not_configured",
    message: "Not Configured — speechSynthesis unavailable in this browser.",
  };
}

export function getWhatsappProviderInfo(): CommunicationProviderInfo {
  if (isWhatsappUiConfigured()) {
    return {
      id: "whatsapp",
      label: "WhatsApp",
      status: "ready",
      message:
        "Ready — Meta Cloud API credentials expected on API (WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID).",
    };
  }
  return {
    id: "whatsapp",
    label: "WhatsApp",
    status: "not_configured",
    message:
      "Not Configured — set WHATSAPP_* on API and NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER_ID (or NEXT_PUBLIC_WHATSAPP_READY=true) on web.",
  };
}

/**
 * Email uses existing emailService transports when configured server-side.
 * UI shows Connected vs Not Configured via NEXT_PUBLIC_EMAIL_READY / NEXT_PUBLIC_EMAIL_PROVIDER.
 */
export function getEmailAutomationProviderInfo(): CommunicationProviderInfo {
  const readyHint = trimEnv(process.env.NEXT_PUBLIC_EMAIL_READY).toLowerCase();
  const providerHint = trimEnv(process.env.NEXT_PUBLIC_EMAIL_PROVIDER).toLowerCase();
  const hinted =
    readyHint === "1" ||
    readyHint === "true" ||
    readyHint === "yes" ||
    readyHint === "on";
  const connected =
    hinted ||
    (providerHint.length > 0 &&
      providerHint !== "none" &&
      providerHint !== "off");

  if (connected) {
    return {
      id: "email",
      label: "Email Automation",
      status: "ready",
      message:
        "Connected — emailService transports (SMTP / Resend / Gmail / relay) expected on API.",
    };
  }

  return {
    id: "email",
    label: "Email Automation",
    status: "not_configured",
    message:
      "Not Configured — set API EMAIL_PROVIDER / SMTP_* / RESEND_API_KEY, then NEXT_PUBLIC_EMAIL_READY=true (or NEXT_PUBLIC_EMAIL_PROVIDER).",
  };
}

export function formatProviderStatusBadge(
  status: CommunicationProviderStatus,
): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "not_configured":
      return "Not Configured";
    case "deferred":
      return "Deferred";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

