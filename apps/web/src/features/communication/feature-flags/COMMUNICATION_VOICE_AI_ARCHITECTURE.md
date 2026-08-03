# Voice AI Architecture (Phase 7 Phase 1)

**Status:** Architecture only. No STT/TTS providers.  
**Constraint:** Voice is a modality on the existing AI Assistant — not a new module or chat API.

---

## Design principles

1. **Same turn boundary** — every voice turn becomes text on `POST /ai/chat/stream`.
2. **Speech I/O outside LLM registry** — STT/TTS adapters ≠ Gemini/OpenAI providers.
3. **Reuse context, memory, actions, approvals** — voice inherits assistant pipeline.
4. **Flag-gated** — `COMMUNICATION_VOICE_*` / `SPEECH_TO_TEXT` / `TEXT_TO_SPEECH`.
5. **Fail open to text** — if STT/TTS unavailable, composer remains fully usable.

---

## Planned components (Phase 2 locations)

| Component | Planned home | Role |
|-----------|--------------|------|
| Mic control | `ai-composer.tsx` (or thin helper under `features/ai/`) | Capture audio |
| STT adapter | Client helper (Web Speech / MediaRecorder → transcript) | Speech → text |
| Send bridge | `ai-assistant-page-content.tsx` `handleSend` | Transcript → existing chat |
| TTS adapter | Page content stream callbacks | Text → speech |
| Session state | Existing `selectedId` + local UI state | Continuous listen loop |
| Commands | Action Framework via transcript text | Spoken intents |

No `features/voice/` package.

---

## Speech-to-Text (planned)

```
Mic → STT adapter → transcript
  → onDraftChange(transcript)  OR  handleSend(transcript)
  → AiChatRequest { conversationId?, message, mode }
  → POST /ai/chat/stream
```

- Flag: `COMMUNICATION_SPEECH_TO_TEXT`
- Permission: `ai:use` + browser microphone permission
- Prerequisite: relax `Permissions-Policy microphone=()` for assistant origin (coordinate with Security flags)

---

## Text-to-Speech (planned)

```
SSE delta / done → TTS adapter → audio playback
Stop / barge-in → AbortController + stop TTS
```

- Flag: `COMMUNICATION_TEXT_TO_SPEECH`
- Prefer speak-on-`done` first; optional incremental TTS later
- Respect user reduced-motion / accessibility prefs where applicable

---

## Voice session lifecycle

| State | Behavior |
|-------|----------|
| Idle | Text composer; mic optional |
| Listening | STT active; show interim transcript in draft |
| Sending | Same optimistic USER/ASSISTANT bubbles as text |
| Speaking | TTS on assistant output |
| Interrupted | Abort stream + stop TTS + optional re-listen |
| Ended | Clear listening flags; keep conversationId |

Continuous assistant mode (`COMMUNICATION_VOICE_ASSISTANT`): listen → send → speak → listen, on same conversation.

---

## Voice context reuse

- Same `prepareChatContext` / active context / memory stages
- Optional ambient `entityRefs` when voice started from a record page
- Mode (ASK / EMAIL / …) unchanged from thread header

---

## Voice interruption strategy

1. User Stop → existing AbortController on stream  
2. Cancel TTS playback  
3. Optionally resume listening if Voice Assistant ON  
4. Partial assistant text remains in UI as today on abort

---

## Voice action execution

```
Spoken command → STT text → chat pipeline
  → actionResolution / planning / execution
  → awaiting_approval blocks writes (unchanged)
```

Flag: `COMMUNICATION_VOICE_COMMANDS` (presentation/help for spoken intents; execution still Action Framework flags).

---

## Voice memory reuse

- Turns stored as normal USER/ASSISTANT messages
- History window / memory permissions unchanged
- No voice-specific memory tables

---

## Voice permissions

| Gate | Mechanism |
|------|-----------|
| Feature | `COMMUNICATION_VOICE_AI` master + modality flags |
| RBAC | `PERMISSIONS.AI_USE` |
| Browser | Microphone permission + Permissions-Policy |
| Actions | Existing action category permissions |
| Privacy | Memory privacy mode still applies |

---

## Mobile / Desktop

| Platform | Plan |
|----------|------|
| Web | Composer mic + TTS; honor mobile history sheet |
| Native mobile | Mirror STT → send on `AiChatScreen`; optionally reuse Communication recording UX patterns for capture only |

---

## Explicit non-goals

- Live calling / telephony
- New `/voice` routes or APIs
- Separate voice conversation store
- Provider integration in Phase 1

---

*Phase 2 may implement adapters behind flags; Phase 1 stops at this design.*
