# Communication Rollback Strategy — Phase 7

**Goal:** Every communication enhancement disables via env without a code rollback.

---

## Principles

1. **Default OFF** — production matches pre–Phase-7 when `COMMUNICATION_*` unset.  
2. **Independent flags** — disable WhatsApp without disabling Voice STT UI, etc.  
3. **Fail open to baseline** — adapters must not break text chat or existing email when OFF.  
4. **No schema/API rollback needed** — contracts unchanged.

---

## Per-flag rollback

| Flag | Enable effect (Phase 2) | Rollback |
|------|-------------------------|----------|
| `ENTERPRISE_FOUNDATION` | Marker / umbrella | Unset |
| `VOICE_AI` | Voice mode toggle | Unset → text-only |
| `VOICE_ASSISTANT` | Continuous listen after reply | Unset |
| `VOICE_COMMANDS` | Spoken command hint | Unset |
| `SPEECH_TO_TEXT` / `SPEECH_UI` | Push-to-talk UI | Unset → hide PTT |
| `TEXT_TO_SPEECH` | Reserved (no live TTS yet) | Unset |
| `VOICE_ACTIONS` | Action Framework status copy | Unset |
| `WHATSAPP` / `WHATSAPP_INTEGRATION` | Enriched WhatsApp payloads | Unset → `NOT_INTEGRATED` stub |
| `WHATSAPP_QUEUE` / `WHATSAPP_MESSAGING` | Claim/process WhatsApp deferred | Unset → WHATSAPP not claimed |
| `EMAIL_AUTOMATION` | Automation queue metadata | Unset |
| `EMAIL_TEMPLATES` | Template HTML enhancement | Unset → prior HTML builders |
| `AI_ASSISTANT` | Reserved orchestration helper | Unset |
| `ORCHESTRATION` | Extra audits / status copy | Unset |
| `STATUS` | Notification Center status strip | Unset |
| `FEEDBACK` | Preference / voice feedback | Unset |

Restart `apps/web` and `apps/api` after env changes.

---

## Emergency order

1. Disable Voice (`SPEECH_UI`, `VOICE_ASSISTANT`, `VOICE_ACTIONS`, `VOICE_COMMANDS`, `VOICE_AI`)  
2. Disable WhatsApp (`WHATSAPP_QUEUE`, `WHATSAPP`)  
3. Disable Email (`EMAIL_AUTOMATION`, `EMAIL_TEMPLATES`)  
4. Disable UX (`STATUS`, `FEEDBACK`, `ORCHESTRATION`)  
5. Confirm AI Assistant text chat + notification email still work

---

## Phase 2 verification

All `COMMUNICATION_*` unset → voice controls absent; WhatsApp claim reverts to EMAIL/IN_APP only; email payloads baseline; Notification Center strip hidden.
