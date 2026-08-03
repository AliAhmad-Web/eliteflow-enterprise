import { parseEnvFlag } from "@/features/ai/feature-flags";

import type {
  CommunicationFeatureFlagId,
  CommunicationFeatureFlags,
} from "./communication-feature-flag.types";
import {
  getEmailAiExecutiveFlags,
  isEmailAiCommandPaletteEnabled,
  isEmailAiContactResolutionEnabled,
  isEmailAiExecutiveAnyEnabled,
  isEmailAiExecutiveUiEnabled,
  isEmailAiGroupsEnabled,
  isEmailAiInsightsEnabled,
  isEmailAiRewriteEnabled,
  isEmailAiScheduleEnabled,
  isEmailAiSearchEnabled,
  isEmailAiSmartPreviewEnabled,
  isEmailAiSmartValidationEnabled,
  isEmailAiThreadsEnabled,
  isEmailAiVoiceEnabled,
} from "./email-ai-executive-flags";

export {
  getEmailAiExecutiveFlags,
  isEmailAiCommandPaletteEnabled,
  isEmailAiContactResolutionEnabled,
  isEmailAiExecutiveAnyEnabled,
  isEmailAiExecutiveUiEnabled,
  isEmailAiGroupsEnabled,
  isEmailAiInsightsEnabled,
  isEmailAiRewriteEnabled,
  isEmailAiScheduleEnabled,
  isEmailAiSearchEnabled,
  isEmailAiSmartPreviewEnabled,
  isEmailAiSmartValidationEnabled,
  isEmailAiThreadsEnabled,
  isEmailAiVoiceEnabled,
};

/**
 * EliteFlow Communication / Voice AI / WhatsApp / Email Automation flags (Phase 7).
 *
 * Production defaults (temporary):
 * - Voice AI + WhatsApp UI: OFF (implementation kept; re-enable via env)
 * - Email Automation + AI Email Workspace: ON (primary communication platform)
 * - EMAIL_AI_* executive enhancements: OFF unless set (opt-in)
 */

const ON = true;
const OFF = false;

export function isCommunicationEnterpriseFoundationEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_COMMUNICATION_ENTERPRISE_FOUNDATION,
    ON,
  );
}

export function isCommunicationVoiceAiEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_COMMUNICATION_VOICE_AI, OFF);
}

export function isCommunicationVoiceAssistantEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_COMMUNICATION_VOICE_ASSISTANT,
    OFF,
  );
}

export function isCommunicationVoiceCommandsEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_COMMUNICATION_VOICE_COMMANDS,
    OFF,
  );
}

export function isCommunicationSpeechToTextEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_COMMUNICATION_SPEECH_TO_TEXT,
    OFF,
  );
}

export function isCommunicationTextToSpeechEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_COMMUNICATION_TEXT_TO_SPEECH,
    OFF,
  );
}

export function isCommunicationWhatsappIntegrationEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_COMMUNICATION_WHATSAPP_INTEGRATION,
    OFF,
  );
}

export function isCommunicationWhatsappMessagingEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_COMMUNICATION_WHATSAPP_MESSAGING,
    OFF,
  );
}

export function isCommunicationEmailAutomationEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_COMMUNICATION_EMAIL_AUTOMATION,
    ON,
  );
}

export function isCommunicationEmailTemplatesEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_COMMUNICATION_EMAIL_TEMPLATES,
    ON,
  );
}

/** Task 7.3 — master Email Workspace shell (production default ON). */
export function isCommunicationEmailWorkspaceEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_COMMUNICATION_EMAIL_WORKSPACE,
    ON,
  );
}

export function isCommunicationEmailAiEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_COMMUNICATION_EMAIL_AI, ON);
}

export function isCommunicationEmailThreadsEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_COMMUNICATION_EMAIL_THREADS,
    OFF,
  );
}

export function isCommunicationEmailVoiceEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_COMMUNICATION_EMAIL_VOICE, OFF);
}

export function isCommunicationEmailSearchEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_COMMUNICATION_EMAIL_SEARCH, OFF);
}

export function isCommunicationEmailSharedInboxEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_COMMUNICATION_EMAIL_SHARED_INBOX,
    OFF,
  );
}

export function isCommunicationEmailSmartReplyEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_COMMUNICATION_EMAIL_SMART_REPLY,
    OFF,
  );
}

export function isCommunicationEmailScheduleEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_COMMUNICATION_EMAIL_SCHEDULE,
    OFF,
  );
}

export function isCommunicationEmailEnterpriseUiEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_COMMUNICATION_EMAIL_ENTERPRISE_UI,
    OFF,
  );
}

export function isCommunicationAiAssistantEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_COMMUNICATION_AI_ASSISTANT,
    ON,
  );
}

/** Push-to-talk / speech UI (also honors SPEECH_TO_TEXT). Default OFF. */
export function isCommunicationSpeechUiEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_COMMUNICATION_SPEECH_UI, OFF) ||
    isCommunicationSpeechToTextEnabled()
  );
}

/** Voice → Action Framework (also honors VOICE_COMMANDS). Default OFF. */
export function isCommunicationVoiceActionsEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_COMMUNICATION_VOICE_ACTIONS, OFF) ||
    isCommunicationVoiceCommandsEnabled()
  );
}

/** WhatsApp channel (also honors WHATSAPP_INTEGRATION). Default OFF. */
export function isCommunicationWhatsappEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_COMMUNICATION_WHATSAPP, OFF) ||
    isCommunicationWhatsappIntegrationEnabled()
  );
}

/** WhatsApp queue processing (also honors WHATSAPP_MESSAGING). Default OFF. */
export function isCommunicationWhatsappQueueEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_COMMUNICATION_WHATSAPP_QUEUE, OFF) ||
    isCommunicationWhatsappMessagingEnabled()
  );
}

export function isCommunicationOrchestrationEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_COMMUNICATION_ORCHESTRATION,
    ON,
  );
}

export function isCommunicationStatusEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_COMMUNICATION_STATUS, ON);
}

export function isCommunicationFeedbackEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_COMMUNICATION_FEEDBACK, ON);
}

/** True when any Voice AI–related flag is ON (modular voice shell). */
export function isCommunicationVoicePresentationEnabled(): boolean {
  return (
    isCommunicationVoiceAiEnabled() ||
    isCommunicationVoiceAssistantEnabled() ||
    isCommunicationVoiceCommandsEnabled() ||
    isCommunicationSpeechToTextEnabled() ||
    isCommunicationTextToSpeechEnabled() ||
    isCommunicationSpeechUiEnabled() ||
    isCommunicationVoiceActionsEnabled()
  );
}

/** True when any WhatsApp-related flag is ON. */
export function isCommunicationWhatsappPresentationEnabled(): boolean {
  return (
    isCommunicationWhatsappEnabled() ||
    isCommunicationWhatsappQueueEnabled() ||
    isCommunicationWhatsappIntegrationEnabled() ||
    isCommunicationWhatsappMessagingEnabled()
  );
}

/** True when any Email Automation–related flag is ON. */
export function isCommunicationEmailPresentationEnabled(): boolean {
  return (
    isCommunicationEmailAutomationEnabled() ||
    isCommunicationEmailTemplatesEnabled() ||
    isCommunicationEmailWorkspaceEnabled() ||
    isEmailAiExecutiveAnyEnabled()
  );
}

/** True when Email Workspace (or any Task 7.3 / EMAIL_AI capability) should present. */
export function isCommunicationEmailWorkspacePresentationEnabled(): boolean {
  return (
    isCommunicationEmailWorkspaceEnabled() ||
    isCommunicationEmailAiEnabled() ||
    isCommunicationEmailThreadsEnabled() ||
    isCommunicationEmailVoiceEnabled() ||
    isCommunicationEmailSearchEnabled() ||
    isCommunicationEmailSharedInboxEnabled() ||
    isCommunicationEmailSmartReplyEnabled() ||
    isCommunicationEmailScheduleEnabled() ||
    isCommunicationEmailEnterpriseUiEnabled() ||
    isEmailAiExecutiveAnyEnabled()
  );
}

export function isCommunicationFeatureEnabled(
  flag: CommunicationFeatureFlagId,
): boolean {
  switch (flag) {
    case "COMMUNICATION_ENTERPRISE_FOUNDATION":
      return isCommunicationEnterpriseFoundationEnabled();
    case "COMMUNICATION_VOICE_AI":
      return isCommunicationVoiceAiEnabled();
    case "COMMUNICATION_VOICE_ASSISTANT":
      return isCommunicationVoiceAssistantEnabled();
    case "COMMUNICATION_VOICE_COMMANDS":
      return isCommunicationVoiceCommandsEnabled();
    case "COMMUNICATION_SPEECH_TO_TEXT":
      return isCommunicationSpeechToTextEnabled();
    case "COMMUNICATION_TEXT_TO_SPEECH":
      return isCommunicationTextToSpeechEnabled();
    case "COMMUNICATION_WHATSAPP_INTEGRATION":
      return isCommunicationWhatsappIntegrationEnabled();
    case "COMMUNICATION_WHATSAPP_MESSAGING":
      return isCommunicationWhatsappMessagingEnabled();
    case "COMMUNICATION_EMAIL_AUTOMATION":
      return isCommunicationEmailAutomationEnabled();
    case "COMMUNICATION_EMAIL_TEMPLATES":
      return isCommunicationEmailTemplatesEnabled();
    case "COMMUNICATION_EMAIL_WORKSPACE":
      return isCommunicationEmailWorkspaceEnabled();
    case "COMMUNICATION_EMAIL_AI":
      return isCommunicationEmailAiEnabled();
    case "COMMUNICATION_EMAIL_THREADS":
      return isCommunicationEmailThreadsEnabled();
    case "COMMUNICATION_EMAIL_VOICE":
      return isCommunicationEmailVoiceEnabled();
    case "COMMUNICATION_EMAIL_SEARCH":
      return isCommunicationEmailSearchEnabled();
    case "COMMUNICATION_EMAIL_SHARED_INBOX":
      return isCommunicationEmailSharedInboxEnabled();
    case "COMMUNICATION_EMAIL_SMART_REPLY":
      return isCommunicationEmailSmartReplyEnabled();
    case "COMMUNICATION_EMAIL_SCHEDULE":
      return isCommunicationEmailScheduleEnabled();
    case "COMMUNICATION_EMAIL_ENTERPRISE_UI":
      return isCommunicationEmailEnterpriseUiEnabled();
    case "EMAIL_AI_CONTACT_RESOLUTION":
      return isEmailAiContactResolutionEnabled();
    case "EMAIL_AI_SMART_PREVIEW":
      return isEmailAiSmartPreviewEnabled();
    case "EMAIL_AI_SMART_VALIDATION":
      return isEmailAiSmartValidationEnabled();
    case "EMAIL_AI_REWRITE":
      return isEmailAiRewriteEnabled();
    case "EMAIL_AI_SCHEDULE":
      return isEmailAiScheduleEnabled();
    case "EMAIL_AI_INSIGHTS":
      return isEmailAiInsightsEnabled();
    case "EMAIL_AI_THREADS":
      return isEmailAiThreadsEnabled();
    case "EMAIL_AI_SEARCH":
      return isEmailAiSearchEnabled();
    case "EMAIL_AI_VOICE":
      return isEmailAiVoiceEnabled();
    case "EMAIL_AI_GROUPS":
      return isEmailAiGroupsEnabled();
    case "EMAIL_AI_EXECUTIVE_UI":
      return isEmailAiExecutiveUiEnabled();
    case "EMAIL_AI_COMMAND_PALETTE":
      return isEmailAiCommandPaletteEnabled();
    case "COMMUNICATION_AI_ASSISTANT":
      return isCommunicationAiAssistantEnabled();
    case "COMMUNICATION_SPEECH_UI":
      return isCommunicationSpeechUiEnabled();
    case "COMMUNICATION_VOICE_ACTIONS":
      return isCommunicationVoiceActionsEnabled();
    case "COMMUNICATION_WHATSAPP":
      return isCommunicationWhatsappEnabled();
    case "COMMUNICATION_WHATSAPP_QUEUE":
      return isCommunicationWhatsappQueueEnabled();
    case "COMMUNICATION_ORCHESTRATION":
      return isCommunicationOrchestrationEnabled();
    case "COMMUNICATION_STATUS":
      return isCommunicationStatusEnabled();
    case "COMMUNICATION_FEEDBACK":
      return isCommunicationFeedbackEnabled();
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}

export function getCommunicationFeatureFlags(): CommunicationFeatureFlags {
  return {
    COMMUNICATION_ENTERPRISE_FOUNDATION:
      isCommunicationEnterpriseFoundationEnabled(),
    COMMUNICATION_VOICE_AI: isCommunicationVoiceAiEnabled(),
    COMMUNICATION_VOICE_ASSISTANT: isCommunicationVoiceAssistantEnabled(),
    COMMUNICATION_VOICE_COMMANDS: isCommunicationVoiceCommandsEnabled(),
    COMMUNICATION_SPEECH_TO_TEXT: isCommunicationSpeechToTextEnabled(),
    COMMUNICATION_TEXT_TO_SPEECH: isCommunicationTextToSpeechEnabled(),
    COMMUNICATION_WHATSAPP_INTEGRATION:
      isCommunicationWhatsappIntegrationEnabled(),
    COMMUNICATION_WHATSAPP_MESSAGING: isCommunicationWhatsappMessagingEnabled(),
    COMMUNICATION_EMAIL_AUTOMATION: isCommunicationEmailAutomationEnabled(),
    COMMUNICATION_EMAIL_TEMPLATES: isCommunicationEmailTemplatesEnabled(),
    COMMUNICATION_EMAIL_WORKSPACE: isCommunicationEmailWorkspaceEnabled(),
    COMMUNICATION_EMAIL_AI: isCommunicationEmailAiEnabled(),
    COMMUNICATION_EMAIL_THREADS: isCommunicationEmailThreadsEnabled(),
    COMMUNICATION_EMAIL_VOICE: isCommunicationEmailVoiceEnabled(),
    COMMUNICATION_EMAIL_SEARCH: isCommunicationEmailSearchEnabled(),
    COMMUNICATION_EMAIL_SHARED_INBOX: isCommunicationEmailSharedInboxEnabled(),
    COMMUNICATION_EMAIL_SMART_REPLY: isCommunicationEmailSmartReplyEnabled(),
    COMMUNICATION_EMAIL_SCHEDULE: isCommunicationEmailScheduleEnabled(),
    COMMUNICATION_EMAIL_ENTERPRISE_UI: isCommunicationEmailEnterpriseUiEnabled(),
    EMAIL_AI_CONTACT_RESOLUTION: isEmailAiContactResolutionEnabled(),
    EMAIL_AI_SMART_PREVIEW: isEmailAiSmartPreviewEnabled(),
    EMAIL_AI_SMART_VALIDATION: isEmailAiSmartValidationEnabled(),
    EMAIL_AI_REWRITE: isEmailAiRewriteEnabled(),
    EMAIL_AI_SCHEDULE: isEmailAiScheduleEnabled(),
    EMAIL_AI_INSIGHTS: isEmailAiInsightsEnabled(),
    EMAIL_AI_THREADS: isEmailAiThreadsEnabled(),
    EMAIL_AI_SEARCH: isEmailAiSearchEnabled(),
    EMAIL_AI_VOICE: isEmailAiVoiceEnabled(),
    EMAIL_AI_GROUPS: isEmailAiGroupsEnabled(),
    EMAIL_AI_EXECUTIVE_UI: isEmailAiExecutiveUiEnabled(),
    EMAIL_AI_COMMAND_PALETTE: isEmailAiCommandPaletteEnabled(),
    COMMUNICATION_AI_ASSISTANT: isCommunicationAiAssistantEnabled(),
    COMMUNICATION_SPEECH_UI: isCommunicationSpeechUiEnabled(),
    COMMUNICATION_VOICE_ACTIONS: isCommunicationVoiceActionsEnabled(),
    COMMUNICATION_WHATSAPP: isCommunicationWhatsappEnabled(),
    COMMUNICATION_WHATSAPP_QUEUE: isCommunicationWhatsappQueueEnabled(),
    COMMUNICATION_ORCHESTRATION: isCommunicationOrchestrationEnabled(),
    COMMUNICATION_STATUS: isCommunicationStatusEnabled(),
    COMMUNICATION_FEEDBACK: isCommunicationFeedbackEnabled(),
  };
}
