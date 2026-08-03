/**
 * Voice session lifecycle helpers for the AI Assistant (Phase 7).
 * STT/TTS providers live in speech-providers.ts; this file is the state machine.
 */

export const VOICE_SESSION_PHASES = [
  "idle",
  "listening",
  "sending",
  "responding",
  "interrupted",
] as const;

export type VoiceSessionPhase = (typeof VOICE_SESSION_PHASES)[number];

export function voiceStatusLabel(phase: VoiceSessionPhase): string {
  switch (phase) {
    case "idle":
      return "Idle";
    case "listening":
      return "Listening";
    case "sending":
      return "Sending";
    case "responding":
      return "Speaking";
    case "interrupted":
      return "Interrupted";
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

export function nextVoicePhaseOnStreamStart(
  voiceMode: boolean,
): VoiceSessionPhase {
  return voiceMode ? "sending" : "idle";
}

export function nextVoicePhaseOnStreamProgress(
  voiceMode: boolean,
): VoiceSessionPhase {
  return voiceMode ? "responding" : "idle";
}

export function nextVoicePhaseOnInterrupt(): VoiceSessionPhase {
  return "interrupted";
}

export function nextVoicePhaseOnIdle(): VoiceSessionPhase {
  return "idle";
}
