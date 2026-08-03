# Voice AI Integration Report

**Scope:** Phase 7 architecture reuse — AI Assistant only (no new chat module).  
**Provider:** Browser Web Speech API (`NEXT_PUBLIC_VOICE_PROVIDER=browser|web_speech`).

## What was integrated

| Capability | Implementation |
|---|---|
| Microphone capture | Browser permission + `SpeechRecognition` |
| Speech-to-Text | `features/ai/utils/speech-providers.ts` → streaming interim + final transcripts into composer draft |
| AI pipeline | Existing `useAiChat` / SSE stream unchanged |
| Text-to-Speech | `speechSynthesis` speaks final assistant reply |
| Interrupt | Cancels TTS + aborts stream + stops recognition |
| Streaming | STT interim results stream into draft; chat stream unchanged; TTS after complete reply |
| Errors / permissions | Toasts for denied mic, unsupported browser, recognition errors |
| Security headers | `Permissions-Policy microphone=(self)` when voice flags ON |

## Files

- `apps/web/src/features/ai/utils/speech-providers.ts` (new)
- `apps/web/src/features/ai/components/ai-assistant-page-content.tsx` (wired)
- `apps/web/src/features/security/hardening/build-security-headers.ts` (mic policy)
- `apps/web/src/features/communication/utils/provider-status.ts` (Ready/Not Configured)

## Env

```
NEXT_PUBLIC_VOICE_PROVIDER=browser
NEXT_PUBLIC_VOICE_LANG=en-US
# VOICE_API_KEY reserved (cloud STT not required for browser mode)
```

## Rollback

- `NEXT_PUBLIC_VOICE_PROVIDER=none` or `NEXT_PUBLIC_COMMUNICATION_SPEECH_TO_TEXT=false` / `TEXT_TO_SPEECH=false` / `VOICE_AI=false`

## Notes

- Chrome/Edge recommended for Web Speech.
- No new routes, schemas, or chat UIs.
