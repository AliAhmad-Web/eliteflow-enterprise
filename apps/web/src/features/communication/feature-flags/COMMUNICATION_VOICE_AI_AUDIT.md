# Voice AI Audit — Existing AI Assistant (Phase 7 Phase 1)

**Status:** Audit only. No Voice AI implementation.  
**Constraint:** Extend the existing AI Assistant — do not create a Voice module.

---

## Summary

EliteFlow has **no Voice AI** on the assistant today. Web and mobile assistants already share `POST /ai/chat` and `POST /ai/chat/stream`. Voice should become an **input/output modality** on those paths. Communication-module voice notes (`VoiceNote` on mobile) are attachment messaging, not AI turns.

---

## 1. Conversation flow

| Layer | Path | Role |
|-------|------|------|
| Route | `apps/web/src/app/(dashboard)/ai-assistant/page.tsx` | Page entry |
| Orchestrator | `features/ai/components/ai-assistant-page-content.tsx` | Selection, draft, stream lifecycle, send/stop/retry |
| Shell | `ai-assistant-enterprise-shell.tsx` / `ai-assistant-legacy-layout.tsx` | Sidebar + thread + composer |
| List | `ai-conversation-sidebar.tsx` | Conversations |
| Messages | `ai-message-list.tsx`, `ai-message-bubble.tsx` | Render + streaming caret |
| Client API | `features/ai/services/ai.service.ts` | REST + SSE |
| API | `apps/api/src/modules/ai/ai.service.ts` | `prepareChatContext` → generate → `finalizeChat` |
| Contract | `packages/shared/src/schemas/ai.schema.ts` | `aiChatRequestSchema` |

**Flow:** select conversation → `handleSend({ conversationId?, message, mode })` → optimistic bubbles → SSE deltas → persisted messages.

**Voice fit:** STT produces `message` text; same flow. No new conversation type.

---

## 2. Streaming

- Client: `chatStream` — events `meta` / `delta` / `done` / `error`; optional `AbortSignal`
- UI: Stop via AbortController when `AI_UI_STREAM_CONTROLS` ON
- API: `ai.controller.ts` SSE; `aiProvider.generateStream` or fake-stream

**Voice fit:** TTS can speak deltas or wait for `done`; barge-in = abort stream + stop TTS.

---

## 3. Composer

- `ai-composer.tsx` — textarea, Send, optional Regenerate / Stop / Retry
- Mode lives in `ai-thread-header.tsx` (ASK / EMAIL / …)

**Voice fit:** mic control fills draft or calls `handleSend(transcript)`. Text path remains fallback.

---

## 4. Context system

- Contract: `ai/foundation/contracts/ai-active-context.ts`
- Resolver: `resolve-active-context.ts` (permission-filtered entity refs)
- Chat hints: `surface: "ASSISTANT"`, `module: "ai"`

**Voice fit:** same `contextHints`; ambient entity refs if launched from a record. Surface stays `ASSISTANT`.

---

## 5. Action framework

Pipeline includes action resolution → planning → workflow → execution (flag-gated).

| Concern | Existing location |
|---------|-------------------|
| Definitions | `foundation/action/builtin-actions.ts` |
| Approval | `action-approval.ts` / `action-execution-approval.ts` |
| Permissions | `action-execution-permissions.ts` |
| Engine | `action-execution-engine.ts` |
| Executor | `action-executor.ts` (existing domain services only) |

**Voice fit:** spoken “do X” → same chat text → same pipeline. No voice-only approval module.

---

## 6. Memory integration

- Conversation history → `prepare-provider-history.ts`
- Broader memory stages flag-gated under `foundation/memory/**`
- Requires `ai:use`; privacy mode disables

**Voice fit:** voice turns are USER messages on the same `conversationId`. No separate voice memory store.

---

## 7. AI providers

- Registry: Gemini (default), OpenAI, Claude (not live), mock
- Text LLM only today

**Voice fit:** STT/TTS sit **outside** the LLM provider registry (browser Web Speech / MediaRecorder, or thin speech API later). LLM traffic stays on `aiProvider`.

---

## 8. Permission model

- Routes: `authenticate` + `PERMISSIONS.AI_USE` (`ai:use`)
- Actions: category → module read permissions
- Mic: browser Permissions-Policy (see security headers) — not RBAC

**Voice fit:** still `ai:use`. Mic policy must allow microphone for assistant origin before web STT (Phase 2 security coordination).

---

## 9. Mobile / Desktop

| Surface | Behavior |
|---------|----------|
| Web desktop | Sidebar + thread grid |
| Web mobile | Optional history sheet (`AI_UI_MOBILE_HISTORY_SHEET`) |
| Native | `apps/mobile/src/features/ai/AiChatScreen.tsx` — same API |
| Security | `build-security-headers.ts` currently sets `microphone=()` — blocker for web STT |

---

## 10. Extension points (no new module)

| Concern | Plug-in |
|---------|---------|
| STT → send | `AiComposer` / `handleSend` in page content |
| TTS | `onDelta` / stream complete |
| Session | Existing `selectedId` + conversation lifecycle |
| Interruption | Existing AbortController |
| Commands | Action Framework via normal chat text |
| Flags | `COMMUNICATION_VOICE_*` / `SPEECH_*` / `TEXT_TO_SPEECH` |

**Do not:** add `/voice` routes, parallel chat APIs, or a Voice feature package.

---

*Phase 2 may wire STT/TTS behind flags; Phase 1 stops at this audit.*
