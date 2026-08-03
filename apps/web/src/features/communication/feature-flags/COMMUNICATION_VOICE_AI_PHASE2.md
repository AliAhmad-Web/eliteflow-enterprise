# Voice AI Foundation — Phase 7 Phase 2

**Flag gates:** `COMMUNICATION_VOICE_AI`, `COMMUNICATION_SPEECH_UI` (+ `SPEECH_TO_TEXT`), `COMMUNICATION_VOICE_COMMANDS`, `COMMUNICATION_VOICE_ACTIONS`, `COMMUNICATION_VOICE_ASSISTANT`

## Implemented

| Item | Detail |
|------|--------|
| Session lifecycle | `idle` → `listening` → `sending` → `responding` → `interrupted` / `idle` |
| Voice mode toggle | Composer control when `VOICE_AI` ON |
| Push-to-talk UI | Hold-to-talk (no live STT) when `SPEECH_UI` ON |
| Interrupt / cancel | AbortController + voice phase `interrupted` |
| Status indicators | `voiceStatusLabel` + composer badge |
| Action integration | Voice turns call existing `handleSend` → SSE → Action Framework |
| Continuous assistant | Optional re-listen after response when `VOICE_ASSISTANT` ON |

## Files

- `features/ai/utils/voice-session.ts`
- `features/ai/components/ai-composer.tsx`
- `features/ai/components/ai-assistant-page-content.tsx`
- `features/ai/components/ai-assistant-enterprise-shell.tsx`

## Explicitly deferred

Live STT, live TTS, telephony, microphone Permissions-Policy changes (coordinate with Security when enabling web STT).
