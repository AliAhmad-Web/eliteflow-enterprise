/**
 * API-side communication feature flags (Phase 7).
 * Production activation: defaults ON. Explicit false/0/off rolls back.
 */

function parseEnvFlag(value: string | undefined, defaultValue = true): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return defaultValue;
  switch (normalized) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      return defaultValue;
  }
}

/**
 * Returns true when any listed env is truthy, or when none are set (default ON).
 * Explicit false on a key disables only if that key is the first defined — for
 * multi-alias flags, any explicit true wins; all unset → ON; all false → OFF.
 */
function flagDefaultOn(...keys: string[]): boolean {
  let sawDefined = false;
  let anyTrue = false;
  for (const key of keys) {
    const raw = process.env[key];
    if (raw === undefined || raw.trim().length === 0) continue;
    sawDefined = true;
    if (parseEnvFlag(raw, true)) anyTrue = true;
  }
  if (!sawDefined) return true;
  return anyTrue;
}

export function isApiCommunicationWhatsappEnabled(): boolean {
  return flagDefaultOn(
    "COMMUNICATION_WHATSAPP",
    "NEXT_PUBLIC_COMMUNICATION_WHATSAPP",
    "COMMUNICATION_WHATSAPP_INTEGRATION",
    "NEXT_PUBLIC_COMMUNICATION_WHATSAPP_INTEGRATION",
  );
}

export function isApiCommunicationWhatsappQueueEnabled(): boolean {
  return flagDefaultOn(
    "COMMUNICATION_WHATSAPP_QUEUE",
    "NEXT_PUBLIC_COMMUNICATION_WHATSAPP_QUEUE",
    "COMMUNICATION_WHATSAPP_MESSAGING",
    "NEXT_PUBLIC_COMMUNICATION_WHATSAPP_MESSAGING",
  );
}

export function isApiCommunicationEmailAutomationEnabled(): boolean {
  return flagDefaultOn(
    "COMMUNICATION_EMAIL_AUTOMATION",
    "NEXT_PUBLIC_COMMUNICATION_EMAIL_AUTOMATION",
  );
}

export function isApiCommunicationEmailTemplatesEnabled(): boolean {
  return flagDefaultOn(
    "COMMUNICATION_EMAIL_TEMPLATES",
    "NEXT_PUBLIC_COMMUNICATION_EMAIL_TEMPLATES",
  );
}

/** Task 7.3 Email Workspace flags — default OFF (opt-in). */
function flagDefaultOff(...keys: string[]): boolean {
  let sawDefined = false;
  let anyTrue = false;
  for (const key of keys) {
    const raw = process.env[key];
    if (raw === undefined || raw.trim().length === 0) continue;
    sawDefined = true;
    if (parseEnvFlag(raw, false)) anyTrue = true;
  }
  if (!sawDefined) return false;
  return anyTrue;
}

export function isApiCommunicationEmailWorkspaceEnabled(): boolean {
  return flagDefaultOff(
    "COMMUNICATION_EMAIL_WORKSPACE",
    "NEXT_PUBLIC_COMMUNICATION_EMAIL_WORKSPACE",
  );
}

export function isApiCommunicationEmailAiEnabled(): boolean {
  return flagDefaultOff(
    "COMMUNICATION_EMAIL_AI",
    "NEXT_PUBLIC_COMMUNICATION_EMAIL_AI",
  );
}

export function isApiCommunicationEmailVoiceEnabled(): boolean {
  return flagDefaultOff(
    "COMMUNICATION_EMAIL_VOICE",
    "NEXT_PUBLIC_COMMUNICATION_EMAIL_VOICE",
  );
}

export function isApiCommunicationEmailScheduleEnabled(): boolean {
  return flagDefaultOff(
    "COMMUNICATION_EMAIL_SCHEDULE",
    "NEXT_PUBLIC_COMMUNICATION_EMAIL_SCHEDULE",
  );
}

export function isApiCommunicationOrchestrationEnabled(): boolean {
  return flagDefaultOn(
    "COMMUNICATION_ORCHESTRATION",
    "NEXT_PUBLIC_COMMUNICATION_ORCHESTRATION",
  );
}
